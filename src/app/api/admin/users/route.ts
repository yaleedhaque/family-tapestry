import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, user: null, error: "Unauthorized" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("approved, role")
    .eq("id", user.id)
    .single();
  if (!profile || profile.role !== "admin") return { supabase: null, user: null, error: "Admin access required" };
  return { supabase, user, profile, error: null };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === "Unauthorized" ? 401 : 403 });

  const db = createServiceClient();

  const { data: profiles, error: pErr } = await db
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 });

  const userIds = (profiles ?? []).map((p: { id: string }) => p.id);

  let users: { id: string; email: string; created_at: string }[] = [];
  if (userIds.length > 0) {
    const { data: authUsers, error: aErr } = await db.auth.admin.listUsers();
    if (!aErr && authUsers?.users) {
      users = authUsers.users
        .filter((u) => userIds.includes(u.id))
        .map((u) => ({ id: u.id, email: u.email ?? "", created_at: u.created_at }));
    }
  }

  const emailMap = new Map(users.map((u) => [u.id, u]));

  const enriched = (profiles ?? []).map((p: Record<string, unknown>) => ({
    ...p,
    email: emailMap.get(p.id as string)?.email ?? "",
    signup_date: emailMap.get(p.id as string)?.created_at ?? p.created_at,
  }));

  return NextResponse.json({ profiles: enriched });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === "Unauthorized" ? 401 : 403 });

  const body = await request.json();
  const { userId, role, approved } = body;

  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const db = createServiceClient();
  const update: Record<string, unknown> = {};
  if (role !== undefined) update.role = role;
  if (approved !== undefined) update.approved = approved;
  update.updated_at = new Date().toISOString();

  const { error } = await db.from("profiles").update(update).eq("id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

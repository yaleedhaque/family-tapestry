import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  const rl = checkRateLimit("audit", 20, 60_000);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429, headers: { "Retry-After": String(Math.ceil(rl.retryAfterMs / 1000)) } });
  }

  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: role } = await supabase
    .from("family_roles")
    .select("role")
    .eq("user_id", user.id)
    .in("role", ["super_admin", "branch_admin"])
    .single();

  if (!role) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: logs, error } = await supabase
    .from("edit_log")
    .select(`
      *,
      persons:person_id (full_name),
      editor:editor_id (email)
    `)
    .order("edited_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ logs });
}

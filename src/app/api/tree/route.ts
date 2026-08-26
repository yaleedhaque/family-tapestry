import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function requireAuth() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { supabase: null, user: null, error: "Unauthorized" };
  const { data: profile } = await supabase
    .from("profiles")
    .select("approved, role")
    .eq("id", user.id)
    .single();
  if (!profile?.approved) return { supabase: null, user: null, error: "Account not approved" };
  return { supabase, user, profile, error: null };
}

export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === "Unauthorized" ? 401 : 403 });

  const db = createServiceClient();

  const [persons, unions, edges, sources] = await Promise.all([
    db.from("persons").select("*"),
    db.from("unions").select("*"),
    db.from("parent_edges").select("*"),
    db.from("sources").select("*"),
  ]);

  if (persons.error || unions.error || edges.error || sources.error) {
    return NextResponse.json({ error: "Failed to fetch tree data" }, { status: 500 });
  }

  return NextResponse.json({
    persons: persons.data ?? [],
    unions: unions.data ?? [],
    edges: edges.data ?? [],
    sources: sources.data ?? [],
  });
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === "Unauthorized" ? 401 : 403 });
  if (auth.profile?.role !== "admin" && auth.profile?.role !== "editor") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const body = await request.json();
  const { persons = [], unions = [], edges = [], sources = [] } = body;

  const db = createServiceClient();

  const { error: delPersons } = await db.from("persons").delete().neq("id", "__none__");
  if (delPersons) return NextResponse.json({ error: "Failed to clear persons" }, { status: 500 });

  const { error: delUnions } = await db.from("unions").delete().neq("id", "__none__");
  if (delUnions) return NextResponse.json({ error: "Failed to clear unions" }, { status: 500 });

  const { error: delEdges } = await db.from("parent_edges").delete().neq("id", "__none__");
  if (delEdges) return NextResponse.json({ error: "Failed to clear edges" }, { status: 500 });

  if (persons.length > 0) {
    const rows = persons.map((p: Record<string, unknown>) => ({
      id: p.id,
      full_name: p.fullName ?? p.full_name ?? "",
      birth_year: p.birthYear ?? p.birth_year ?? null,
      death_year: p.deathYear ?? p.death_year ?? null,
      is_alive: p.isAlive ?? p.is_alive ?? true,
      birth_place: p.birthPlace ?? p.birth_place ?? null,
      death_place: p.deathPlace ?? p.death_place ?? null,
      profession: p.profession ?? null,
      bio: p.bio ?? null,
      photo_url: p.photoUrl ?? p.photo_url ?? null,
      email: p.email ?? null,
      phone: p.phone ?? null,
      address: p.address ?? null,
      website: p.website ?? null,
      lat: p.lat ?? null,
      lng: p.lng ?? null,
      links: p.links ?? "[]",
      metadata: p.metadata ?? "{}",
      privacy_level: p.privacy_level ?? "family",
      created_by: auth.user!.id,
    }));
    const { error } = await db.from("persons").insert(rows);
    if (error) return NextResponse.json({ error: `Persons insert failed: ${error.message}` }, { status: 500 });
  }

  if (unions.length > 0) {
    const rows = unions.map((u: Record<string, unknown>) => ({
      id: u.id,
      partner_a: u.partnerA ?? u.partner_a ?? "",
      partner_b: u.partnerB ?? u.partner_b ?? "",
      union_type: u.type ?? u.union_type ?? "marriage",
      start_year: u.startYear ?? u.start_year ?? null,
      end_year: u.endYear ?? u.end_year ?? null,
    }));
    const { error } = await db.from("unions").insert(rows);
    if (error) return NextResponse.json({ error: `Unions insert failed: ${error.message}` }, { status: 500 });
  }

  if (edges.length > 0) {
    const rows = edges.map((e: Record<string, unknown>, i: number) => ({
      id: e.id ?? `pe-${i}`,
      union_id: e.unionId ?? e.union_id ?? "",
      child_id: e.childId ?? e.child_id ?? "",
      relationship_type: e.relationshipType ?? e.relationship_type ?? "biological",
    }));
    const { error } = await db.from("parent_edges").insert(rows);
    if (error) return NextResponse.json({ error: `Edges insert failed: ${error.message}` }, { status: 500 });
  }

  if (sources.length > 0) {
    const rows = sources.map((s: Record<string, unknown>) => ({
      id: s.id,
      person_id: s.personId ?? s.person_id ?? "",
      type: s.type ?? "other",
      title: s.title ?? "",
      url: s.url ?? "",
      notes: s.notes ?? "",
      date_added: s.dateAdded ?? s.date_added ?? new Date().toISOString(),
    }));
    const { error } = await db.from("sources").insert(rows);
    if (error) return NextResponse.json({ error: `Sources insert failed: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

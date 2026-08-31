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

  //  --  Non-destructive sync ------------------------------------------------
  //  Upsert the incoming rows first (never wipe the tree), then delete only the
  //  rows that are genuinely absent from the payload. Insert-before-delete means a
  //  mid-way failure can never erase data, and unchanged rows keep their
  //  created_at / created_by. Scales with the number of edits, not tree size.

  const currentIds = async (table: string) => {
    const { data } = await db.from(table).select("id");
    return new Set<string>((data ?? []).map((r) => String((r as { id: unknown }).id)));
  };
  const deleteMissing = async (
    table: string,
    payload: Record<string, unknown>[],
    idFn: (r: Record<string, unknown>) => string,
    existing: Set<string>
  ) => {
    const keep = new Set<string>(payload.map((r) => String(idFn(r))));
    const gone = Array.from(existing).filter((id) => !keep.has(id));
    if (gone.length === 0) return null;
    return (await db.from(table).delete().in("id", gone)).error;
  };

  // persons (preserve existing created_by on updates)
  const { data: existingPersons } = await db
    .from("persons")
    .select("id, created_by");
  const createdBy = new Map<string, string>(
    (existingPersons ?? []).map((r: Record<string, unknown>) => [
      String(r.id),
      String(r.created_by),
    ])
  );
  const personRows = persons.map((p: Record<string, unknown>) => ({
    id: String(p.id),
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
    created_by: createdBy.get(String(p.id)) ?? auth.user!.id,
  }));
  if (personRows.length > 0) {
    const { error } = await db.from("persons").upsert(personRows, { onConflict: "id" });
    if (error) return NextResponse.json({ error: `Persons upsert failed: ${error.message}` }, { status: 500 });
  }
  {
    const existing = await currentIds("persons");
    const err = await deleteMissing("persons", persons, (r) => String(r.id), existing);
    if (err) return NextResponse.json({ error: `Persons delete failed: ${err.message}` }, { status: 500 });
  }

  // unions
  const unionRows = unions.map((u: Record<string, unknown>) => ({
    id: String(u.id),
    partner_a: u.partnerA ?? u.partner_a ?? "",
    partner_b: u.partnerB ?? u.partner_b ?? "",
    union_type: u.type ?? u.union_type ?? "marriage",
    start_year: u.startYear ?? u.start_year ?? null,
    end_year: u.endYear ?? u.end_year ?? null,
  }));
  if (unionRows.length > 0) {
    const { error } = await db.from("unions").upsert(unionRows, { onConflict: "id" });
    if (error) return NextResponse.json({ error: `Unions upsert failed: ${error.message}` }, { status: 500 });
  }
  {
    const existing = await currentIds("unions");
    const err = await deleteMissing("unions", unions, (r) => String(r.id), existing);
    if (err) return NextResponse.json({ error: `Unions delete failed: ${err.message}` }, { status: 500 });
  }

  // parent edges (stable id derived from the (union_id, child_id) natural key)
  const edgeRows = edges.map((e: Record<string, unknown>) => {
    const rawId = e.id != null && String(e.id).trim() !== "" ? String(e.id) : "";
    const derived = `pe-${String(e.unionId ?? e.union_id)}-${String(e.childId ?? e.child_id)}`;
    return {
      id: rawId || derived,
      union_id: e.unionId ?? e.union_id ?? "",
      child_id: e.childId ?? e.child_id ?? "",
      relationship_type: e.relationshipType ?? e.relationship_type ?? "biological",
    };
  });
  if (edgeRows.length > 0) {
    const { error } = await db.from("parent_edges").upsert(edgeRows, { onConflict: "id" });
    if (error) return NextResponse.json({ error: `Edges upsert failed: ${error.message}` }, { status: 500 });
  }
  {
    const existing = await currentIds("parent_edges");
    const err = await deleteMissing("parent_edges", edgeRows, (r) => String((r as { id: string }).id), existing);
    if (err) return NextResponse.json({ error: `Edges delete failed: ${err.message}` }, { status: 500 });
  }

  // sources
  const sourceRows = sources.map((s: Record<string, unknown>) => ({
    id: String(s.id),
    person_id: s.personId ?? s.person_id ?? "",
    type: s.type ?? "other",
    title: s.title ?? "",
    url: s.url ?? "",
    notes: s.notes ?? "",
    date_added: s.dateAdded ?? s.date_added ?? new Date().toISOString(),
  }));
  if (sourceRows.length > 0) {
    const { error } = await db.from("sources").upsert(sourceRows, { onConflict: "id" });
    if (error) return NextResponse.json({ error: `Sources upsert failed: ${error.message}` }, { status: 500 });
  }
  {
    const existing = await currentIds("sources");
    const err = await deleteMissing("sources", sourceRows, (r) => String(r.id), existing);
    if (err) return NextResponse.json({ error: `Sources delete failed: ${err.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

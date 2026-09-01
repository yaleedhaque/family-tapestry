import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { loadCircleData, resolveEdit } from "@/lib/server-permissions";
import { canEditField, type Role } from "@/lib/permissions";

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

function forbidden(msg = "Insufficient permissions") {
  return NextResponse.json({ error: msg }, { status: 403 });
}

interface TreePutBody {
  persons?: Record<string, unknown>[];
  unions?: Record<string, unknown>[];
  edges?: Record<string, unknown>[];
  sources?: Record<string, unknown>[];
}

/* ------------------------------------------------------------------ */
/* Editor/Admin: existing non-destructive insert-then-delete sync.     */
/* ------------------------------------------------------------------ */
async function syncFullTree(db: ReturnType<typeof createServiceClient>, body: TreePutBody, userId: string) {
  const { persons = [], unions = [], edges = [], sources = [] } = body;

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
  const { data: existingPersons } = await db.from("persons").select("id, created_by");
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
    created_by: createdBy.get(String(p.id)) ?? userId,
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

/* ------------------------------------------------------------------ */
/* User role: circle-guarded sync.                                     */
/* ------------------------------------------------------------------ */
async function syncUserTree(db: ReturnType<typeof createServiceClient>, body: TreePutBody, userId: string) {
  const { persons = [], unions = [], edges = [], sources = [] } = body;

  // Sources are Editor/Admin only (matrix: edit any ... source). A User's PUT
  // may not include source rows at all.
  if (sources.length > 0) {
    return forbidden("Sources are editable by editors/admins only");
  }

  const circle = await loadCircleData(db, userId);

  // ---- Persons -------------------------------------------------------
  const { data: existingPersonRows } = await db.from("persons").select("*");
  const existingById = new Map<string, Record<string, unknown>>(
    (existingPersonRows ?? []).map((r) => [String(r.id), r as unknown as Record<string, unknown>])
  );

  const personRows: Record<string, unknown>[] = [];
  const payloadPersonIds = new Set<string>();

  for (const p of persons) {
    const id = String(p.id);
    payloadPersonIds.add(id);
    const current = existingById.get(id);
    const row = normalizePerson(p, current ? String(current.created_by ?? "") : userId);

    if (!current) {
      // New person — a User may add people (their own node / parents / partner / children).
      personRows.push(row);
      continue;
    }

    // Existing person — check for modifications.
    if (personFieldsDiffer(current, p)) {
      const res = resolveEdit("user", circle, id);
      if (res.kind === "none") return forbidden("Not allowed to edit a person outside your circle");
      const requested = Object.keys(p)
        .map((k) => k.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase()))
        .filter((c) => c !== "id" && c !== "created_by" && c !== "created_at" && c !== "updated_at" && c !== "version");
      if (res.kind === "circle") {
        const blocked = requested.filter((c) => !canEditField("user", circle, id, c));
        if (blocked.length > 0) return forbidden(`Not allowed to edit private field: ${blocked[0]}`);
      }
      personRows.push(row);
    }
  }

  // Deletions are Editor/Admin only (rule 5.3).
  for (const id of Array.from(existingById.keys())) {
    if (!payloadPersonIds.has(id)) return forbidden("Deleting persons is Editor/Admin only");
  }

  if (personRows.length > 0) {
    const { error } = await db.from("persons").upsert(personRows, { onConflict: "id" });
    if (error) return NextResponse.json({ error: `Persons upsert failed: ${error.message}` }, { status: 500 });
  }

  // ---- Unions & edges (structural changes) ---------------------------
  const { data: existingUnionRows } = await db.from("unions").select("*");
  const existingUnionsById = new Map<string, Record<string, unknown>>(
    (existingUnionRows ?? []).map((r) => [String(r.id), r as unknown as Record<string, unknown>])
  );
  const { data: existingEdgeRows } = await db.from("parent_edges").select("*");
  const existingEdgesById = new Map<string, Record<string, unknown>>(
    (existingEdgeRows ?? []).map((r) => [String(r.id), r as unknown as Record<string, unknown>])
  );

  const isCircleOrSelf = (pid: string) => circle.circlePersonIds.has(pid) || circle.selfPersonIds.has(pid);
  const involvedWithCircle = (partnerA: string, partnerB: string) =>
    (partnerA && isCircleOrSelf(partnerA)) || (partnerB && isCircleOrSelf(partnerB));

  const newUnions: Record<string, unknown>[] = [];
  const newEdges: Record<string, unknown>[] = [];
  const payloadUnionIds = new Set<string>();
  const payloadEdgeIds = new Set<string>();

  // Unions
  for (const u of unions) {
    const id = String(u.id);
    payloadUnionIds.add(id);
    const current = existingUnionsById.get(id);
    const partnerA = String(u.partnerA ?? u.partner_a ?? "");
    const partnerB = String(u.partnerB ?? u.partner_b ?? "");
    if (!current) {
      // New union must involve the user's circle (they are adding a relationship they belong to).
      if (!involvedWithCircle(partnerA, partnerB)) {
        return forbidden("Not allowed to create a relationship outside your circle");
      }
      newUnions.push({
        id,
        partner_a: partnerA,
        partner_b: partnerB,
        union_type: u.type ?? u.union_type ?? "marriage",
        start_year: u.startYear ?? u.start_year ?? null,
        end_year: u.endYear ?? u.end_year ?? null,
        created_by: userId,
      });
    } else {
      // Modified union must involve the circle.
      if (unionRowsDiffer(current, u)) {
        if (!involvedWithCircle(partnerA, partnerB)) {
          return forbidden("Not allowed to edit a relationship outside your circle");
        }
        newUnions.push({
          ...current,
          id,
          partner_a: partnerA,
          partner_b: partnerB,
          union_type: u.type ?? u.union_type ?? "marriage",
          start_year: u.startYear ?? u.start_year ?? null,
          end_year: u.endYear ?? u.end_year ?? null,
          created_by: current.created_by ?? userId,
        });
      }
    }
  }
  // Union deletions: only a user's own partnership (involves a self person).
  for (const id of Array.from(existingUnionsById.keys())) {
    if (payloadUnionIds.has(id)) continue;
    const cur = existingUnionsById.get(id)!;
    const a = String(cur.partner_a ?? "");
    const b = String(cur.partner_b ?? "");
    if (!(circle.selfPersonIds.has(a) || circle.selfPersonIds.has(b))) {
      return forbidden("Not allowed to delete a relationship outside your own partnership");
    }
  }

  // Edges
  for (const e of edges) {
    const rawId = e.id != null && String(e.id).trim() !== "" ? String(e.id) : "";
    const derived = `pe-${String(e.unionId ?? e.union_id)}-${String(e.childId ?? e.child_id)}`;
    const id = rawId || derived;
    payloadEdgeIds.add(id);
    const current = existingEdgesById.get(id);
    const unionId = String(e.unionId ?? e.union_id ?? "");
    const childId = String(e.childId ?? e.child_id ?? "");

    const unionIsCircle = existingUnionsById.has(unionId)
      ? involvedWithCircle(
          String(existingUnionsById.get(unionId)!.partner_a ?? ""),
          String(existingUnionsById.get(unionId)!.partner_b ?? "")
        )
      : newUnions.some((nu) => String(nu.id) === unionId);

    if (!current) {
      // New child edge only if the union is part of the circle (child's parent is circle).
      if (!unionIsCircle) return forbidden("Not allowed to add a parent-child connection outside your circle");
      newEdges.push({
        id,
        union_id: unionId,
        child_id: childId,
        relationship_type: e.relationshipType ?? e.relationship_type ?? "biological",
        created_by: userId,
      });
    } else {
      if (edgeRowsDiffer(current, e)) {
        if (!unionIsCircle) return forbidden("Not allowed to edit a parent-child connection outside your circle");
        newEdges.push({
          ...current,
          id,
          union_id: unionId,
          child_id: childId,
          relationship_type: e.relationshipType ?? e.relationship_type ?? "biological",
          created_by: current.created_by ?? userId,
        });
      }
    }
  }
  // Edge deletions: only for unions in the user's circle.
  for (const id of Array.from(existingEdgesById.keys())) {
    if (payloadEdgeIds.has(id)) continue;
    const cur = existingEdgesById.get(id)!;
    const unionId = String(cur.union_id ?? "");
    const uni = existingUnionsById.get(unionId);
    const involvesSelf = uni && (circle.selfPersonIds.has(String(uni.partner_a ?? "")) || circle.selfPersonIds.has(String(uni.partner_b ?? "")));
    if (!involvesSelf) return forbidden("Not allowed to delete a parent-child connection outside your circle");
  }

  if (newUnions.length > 0) {
    const { error } = await db.from("unions").upsert(newUnions, { onConflict: "id" });
    if (error) return NextResponse.json({ error: `Unions upsert failed: ${error.message}` }, { status: 500 });
  }
  if (newEdges.length > 0) {
    const { error } = await db.from("parent_edges").upsert(newEdges, { onConflict: "id" });
    if (error) return NextResponse.json({ error: `Edges upsert failed: ${error.message}` }, { status: 500 });
  }
  // Apply allowed deletions.
  const deleteIdSet = (table: string, kept: Set<string>) => {
    const gone = Array.from(
      (table === "unions" ? existingUnionsById : existingEdgesById).keys()
    ).filter((id) => !kept.has(id));
    if (gone.length > 0) return db.from(table).delete().in("id", gone);
    return Promise.resolve({ error: null });
  };
  {
    const err = (await deleteIdSet("unions", payloadUnionIds)).error;
    if (err) return NextResponse.json({ error: `Unions delete failed: ${err.message}` }, { status: 500 });
  }
  {
    const err = (await deleteIdSet("parent_edges", payloadEdgeIds)).error;
    if (err) return NextResponse.json({ error: `Edges delete failed: ${err.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

/* ---------- shared row helpers ---------- */
function normalizePerson(p: Record<string, unknown>, createdBy: string): Record<string, unknown> {
  return {
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
    created_by: createdBy,
  };
}

function personFieldsDiffer(dbRow: Record<string, unknown>, payload: Record<string, unknown>): boolean {
  return [
    "full_name", "birth_year", "death_year", "is_alive", "birth_place", "death_place",
    "profession", "bio", "photo_url", "email", "phone", "address", "website", "lat", "lng",
  ].some((col) => {
    const pv = payload[col] ?? payload[camel(col)];
    return String(dbRow[col] ?? "") !== String(pv ?? "");
  });
}

function unionRowsDiffer(dbRow: Record<string, unknown>, payload: Record<string, unknown>): boolean {
  const fields: [string, string][] = [
    ["partner_a", "partnerA"], ["partner_b", "partnerB"], ["union_type", "type"],
    ["start_year", "startYear"], ["end_year", "endYear"],
  ];
  return fields.some(([col, camelCol]) => {
    const pv = payload[col] ?? payload[camelCol];
    const dbv = dbRow[col];
    if (dbv === null || dbv === undefined) return pv !== null && pv !== undefined && String(pv) !== "";
    return String(dbv) !== String(pv ?? "");
  });
}

function edgeRowsDiffer(dbRow: Record<string, unknown>, payload: Record<string, unknown>): boolean {
  const fields: [string, string][] = [
    ["union_id", "unionId"], ["child_id", "childId"], ["relationship_type", "relationshipType"],
  ];
  return fields.some(([col, camelCol]) => {
    const pv = payload[col] ?? payload[camelCol];
    return String(dbRow[col] ?? "") !== String(pv ?? "");
  });
}

function camel(col: string): string {
  return col.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

/* ------------------------------------------------------------------ */
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

  const role = (auth.profile?.role ?? "viewer") as Role;
  if (role !== "admin" && role !== "editor" && role !== "user") return forbidden();

  const body = await request.json();
  const db = createServiceClient();

  if (role === "user") {
    return syncUserTree(db, body, auth.user!.id);
  }
  return syncFullTree(db, body, auth.user!.id);
}

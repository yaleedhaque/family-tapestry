import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { loadCircleData, resolveEdit } from "@/lib/server-permissions";
import { can, canEditField, type Role } from "@/lib/permissions";

// Publicly editable NAME fields. Any logged-in member (admin/editor/user) may
// correct a person's name regardless of whether they are inside that person's
// edit circle — a name is public genealogical data and should not be locked
// behind the circle. EVERYTHING else stays gated by the existing rules.
const PUBLIC_NAME_FIELDS = new Set(["full_name", "name_native"]);
import {
  normalizeGender,
  wouldGenderChangeBreakRule,
  type Gender,
} from "@/lib/parentRules";

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

function forbidden() {
  return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
}

/** Normalize an incoming patch key to its snake_case column for field checks. */
function toColumn(key: string): string {
  return key.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase());
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === "Unauthorized" ? 401 : 403 });

  const role = (auth.profile?.role ?? "viewer") as Role;
  // Viewer cannot create shared-tree persons. User can (add self/parent/partner/child).
  if (!can(role, "create-person")) return forbidden();

  const body = await request.json();
  const { id, fullName, full_name, nameNative, name_native, gender, birthYear, birth_year, deathYear, death_year, isAlive, is_alive, bio, birthPlace, birth_place, profession, photoUrl, photo_url, email, phone, address, website, lat, lng } = body;

  if (!id || !fullName && !full_name) {
    return NextResponse.json({ error: "id and fullName required" }, { status: 400 });
  }

  const db = createServiceClient();
  const { error } = await db.from("persons").insert({
    id,
    full_name: fullName ?? full_name ?? "",
    gender: normalizeGender(gender as string | undefined),
    name_native: nameNative ?? name_native ?? null,
    birth_year: birthYear ?? birth_year ?? null,
    death_year: deathYear ?? death_year ?? null,
    is_alive: isAlive ?? is_alive ?? true,
    birth_place: birthPlace ?? birth_place ?? null,
    profession: profession ?? null,
    bio: bio ?? null,
    photo_url: photoUrl ?? photo_url ?? null,
    email: email ?? null,
    phone: phone ?? null,
    address: address ?? null,
    website: website ?? null,
    lat: lat ?? null,
    lng: lng ?? null,
    links: "[]",
    metadata: "{}",
    privacy_level: "family",
    created_by: auth.user!.id,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, id });
}

export async function PATCH(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === "Unauthorized" ? 401 : 403 });

  const role = (auth.profile?.role ?? "viewer") as Role;
  const body = await request.json();
  const { id, ...fields } = body;
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = createServiceClient();

  // Changing gender can retroactively create two biological mothers/fathers
  // for the person's children — block that (any role).
  if (fields.gender !== undefined || fields.gender !== undefined) {
    const newGender = normalizeGender((fields.gender ?? fields.gender ?? "") as string);
    const oldGender =
      (await db.from("persons").select("gender").eq("id", id).single()).data?.gender ?? "";
    if (newGender !== oldGender) {
      const [unionsRes, edgesRes] = await Promise.all([
        db.from("unions").select("id, partner_a, partner_b"),
        db.from("parent_edges").select("union_id, child_id, relationship_type"),
      ]);
      const personsRes = await db.from("persons").select("id, gender");
      const genderById = new Map<string, Gender>();
      for (const p of personsRes.data ?? []) genderById.set(String(p.id), normalizeGender((p as { gender?: string }).gender));
      const violation = wouldGenderChangeBreakRule(
        (unionsRes.data ?? []).map((u) => ({
          id: String(u.id),
          partnerA: String((u as { partner_a?: string }).partner_a ?? ""),
          partnerB: String((u as { partner_b?: string }).partner_b ?? ""),
        })),
        (edgesRes.data ?? []).map((e) => ({
          unionId: String((e as { union_id?: string }).union_id ?? ""),
          childId: String((e as { child_id?: string }).child_id ?? ""),
          relationshipType: (e as { relationship_type?: string }).relationship_type,
        })),
        genderById,
        String(id),
        newGender
      );
      if (violation) {
        return NextResponse.json(
          { error: `Changing this person's gender to that value would leave a child with two biological ${violation === "mother" ? "mothers" : "fathers"}. Use "Step" or "Adopted" instead.` },
          { status: 400 }
        );
      }
    }
  }

  if (role === "admin" || role === "editor") {
    const update = mapFields(fields);
    if (Object.keys(update).length > 0) {
      update.updated_at = new Date().toISOString();
      const { error } = await db.from("persons").update(update).eq("id", id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  if (role !== "user") return forbidden();

  // User role: enforce circle + field-level rules (5.2). The ONLY relaxation is
  // the name: any user may rename any person (PUBLIC_NAME_FIELDS), so a "none"
  // (outside-circle) person can still have its name corrected.
  const circle = await loadCircleData(db, auth.user!.id);
  const res = resolveEdit(role, circle, id);

  const requestedCols = Object.keys(fields).map(toColumn);

  // Word-fields phase (outside circle): only the public NAME fields are allowed.
  if (res.kind === "none") {
    const nonName = requestedCols.filter((f) => !PUBLIC_NAME_FIELDS.has(f));
    if (nonName.length > 0) {
      return forbidden();
    }
  } else if (res.kind === "circle") {
    // Non-self circle member: only genealogical fields (block private).
    const blocked = requestedCols.filter((f: string) => !canEditField("user", circle, id, f));
    if (blocked.length > 0) {
      return NextResponse.json(
        { error: `Not allowed to edit private field: ${blocked[0]}` },
        { status: 403 }
      );
    }
  }

  const update = mapFields(fields);
  if (Object.keys(update).length > 0) {
    update.updated_at = new Date().toISOString();
    const { error } = await db.from("persons").update(update).eq("id", id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.error === "Unauthorized" ? 401 : 403 });

  const role = (auth.profile?.role ?? "viewer") as Role;
  // Deletion of any person is Editor/Admin only (rule 5.3 / matrix).
  if (!can(role, "edit-any")) return forbidden();

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = createServiceClient();

  await db.from("parent_edges").delete().eq("child_id", id);
  await db.from("parent_edges").delete().in("union_id",
    (await db.from("unions").select("id").or(`partner_a.eq.${id},partner_b.eq.${id}`)).data?.map((u: { id: string }) => u.id) ?? []
  );
  await db.from("unions").delete().or(`partner_a.eq.${id},partner_b.eq.${id}`);
  await db.from("sources").delete().eq("person_id", id);
  const { error } = await db.from("persons").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

function mapFields(fields: Record<string, unknown>): Record<string, unknown> {
  const update: Record<string, unknown> = {};
  if (fields.fullName !== undefined || fields.full_name !== undefined) update.full_name = fields.fullName ?? fields.full_name;
  if (fields.gender !== undefined || fields.gender !== undefined) update.gender = normalizeGender((fields.gender ?? fields.gender ?? "") as string);
  if (fields.nameNative !== undefined || fields.name_native !== undefined) update.name_native = fields.nameNative ?? fields.name_native;
  if (fields.birthYear !== undefined || fields.birth_year !== undefined) update.birth_year = fields.birthYear ?? fields.birth_year;
  if (fields.deathYear !== undefined || fields.death_year !== undefined) update.death_year = fields.deathYear ?? fields.death_year;
  if (fields.isAlive !== undefined || fields.is_alive !== undefined) update.is_alive = fields.isAlive ?? fields.is_alive;
  if (fields.birthPlace !== undefined || fields.birth_place !== undefined) update.birth_place = fields.birthPlace ?? fields.birth_place;
  if (fields.deathPlace !== undefined || fields.death_place !== undefined) update.death_place = fields.deathPlace ?? fields.death_place;
  if (fields.profession !== undefined) update.profession = fields.profession;
  if (fields.bio !== undefined) update.bio = fields.bio;
  if (fields.photoUrl !== undefined || fields.photo_url !== undefined) update.photo_url = fields.photoUrl ?? fields.photo_url;
  if (fields.email !== undefined) update.email = fields.email;
  if (fields.phone !== undefined) update.phone = fields.phone;
  if (fields.address !== undefined) update.address = fields.address;
  if (fields.website !== undefined) update.website = fields.website;
  if (fields.lat !== undefined) update.lat = fields.lat;
  if (fields.lng !== undefined) update.lng = fields.lng;
  return update;
}

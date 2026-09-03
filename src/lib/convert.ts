// Canonical data-conversion helpers.
//
// These normalize between three shapes:
//   - Db*    : raw Supabase row (snake_case)  →  see types.ts
//   - *Like  : camelCase UI shape used across components  →  see InfoPanel.tsx
//   - Person : static demo/fallback shape  →  see data/family.ts
//
// They used to be copy-pasted into TapestryCanvas, /person/[id], /timeline and
// /map (four near-identical implementations that drifted apart). Keeping them in
// ONE place means every read/write path converts identically.

import type { Source } from "@/data/family";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";
import type { DbPerson } from "@/lib/types";

/** Normalize a DB person row (or an already-normal PersonLike) into PersonLike. */
export function toPersonLike(p: PersonLike | DbPerson): PersonLike {
  if ("fullName" in p && "birthPlace" in p && "bio" in p) return p as PersonLike;
  const dp = p as DbPerson;
  return {
    id: dp.id,
    fullName: dp.full_name,
    nameNative: dp.name_native ?? null,
    gender: dp.gender ?? "",
    birthYear: dp.birth_year,
    deathYear: dp.death_year,
    isAlive: dp.is_alive,
    bio: dp.bio ?? "",
    birthPlace: dp.birth_place ?? "",
    profession: dp.profession ?? "",
    email: dp.email ?? "",
    phone: dp.phone ?? "",
    address: dp.address ?? "",
    website: dp.website ?? "",
    lat: dp.lat ?? null,
    lng: dp.lng ?? null,
    photoUrl: dp.photo_url ?? "",
    updatedAt: dp.updated_at ?? null,
    createdBy: dp.created_by ?? null,
  };
}

/** Back to the snake_case shape the DB / PUT payload expects. */
export function toDbPerson(p: PersonLike) {
  return {
    id: p.id,
    fullName: p.fullName,
    nameNative: p.nameNative ?? null,
    gender: p.gender ?? "",
    birthYear: p.birthYear,
    deathYear: p.deathYear,
    isAlive: p.isAlive,
    bio: p.bio,
    birthPlace: p.birthPlace,
    profession: p.profession,
    email: p.email,
    phone: p.phone,
    address: p.address,
    website: p.website,
    lat: p.lat,
    lng: p.lng,
    photoUrl: p.photoUrl,
  };
}

type UnionInput = {
  id: string;
  partnerA?: string;
  partner_a?: string;
  partnerB?: string;
  partner_b?: string;
  type?: string;
  union_type?: string;
  startYear?: number | null;
  start_year?: number | null;
  endYear?: number | null;
  end_year?: number | null;
  createdBy?: string | null;
  created_by?: string | null;
};

/** Normalize a union row (accepts both DbUnion snake_case and camelCase UI shape). */
export function toUnionLike(raw: UnionInput): UnionLike {
  return {
    id: raw.id,
    partnerA: raw.partnerA ?? raw.partner_a ?? "",
    partnerB: raw.partnerB ?? raw.partner_b ?? "",
    type: raw.type ?? raw.union_type ?? "marriage",
    startYear: raw.startYear ?? raw.start_year ?? null,
    endYear: raw.endYear ?? raw.end_year ?? null,
    createdBy: raw.createdBy ?? raw.created_by ?? null,
  };
}

type EdgeInput = {
  unionId?: string;
  union_id?: string;
  childId?: string;
  child_id?: string;
  relationshipType?: string;
  relationship_type?: string;
  createdBy?: string | null;
  created_by?: string | null;
};

/** Normalize a parent edge (accepts both DbParentEdge snake_case and camelCase UI shape). */
export function toEdgeLike(e: EdgeInput): EdgeLike {
  return {
    unionId: e.unionId ?? e.union_id ?? "",
    childId: e.childId ?? e.child_id ?? "",
    relationshipType: e.relationshipType ?? e.relationship_type ?? "biological",
    createdBy: e.createdBy ?? e.created_by ?? null,
  };
}

/** Narrow a union to the id/partners subset a PUT payload needs. */
export function toUnionRow(u: UnionLike): { id: string; partnerA: string; partnerB: string } {
  return { id: u.id, partnerA: u.partnerA, partnerB: u.partnerB };
}

/** Narrow an edge to the fields a PUT payload needs. */
export function toEdgeRow(e: EdgeLike): { unionId: string; childId: string; relationshipType?: string } {
  return { unionId: e.unionId, childId: e.childId, relationshipType: e.relationshipType };
}

/** True for an explicitly biological (or unspecified) parent relationship. */
export function isBio(rel?: string): boolean {
  if (!rel) return true;
  return rel.trim().toLowerCase() === "biological";
}

/** Source → snake_case payload shape. */
export function toDbSource(s: Source) {
  return {
    id: s.id,
    personId: s.personId,
    type: s.type,
    title: s.title,
    url: s.url,
    notes: s.notes,
    dateAdded: s.dateAdded,
  };
}
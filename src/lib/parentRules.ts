// Pure rules for parent roles — "a child cannot have two mothers (or fathers)".
// No React/Supabase imports so this stays unit-testable in node.
//
// A person's gender is one of "" (unknown), "female", "male", "other".
// The rule only trips on EXPLICIT known genders, so legacy/unknown data
// (gender = "") is never blocked and a single parent record can be added
// before the other parent is even in the tree.

export type Gender = "" | "female" | "male" | "other";

export interface UnionRow {
  id: string;
  partnerA: string;
  partnerB: string;
}

export interface EdgeRow {
  unionId: string;
  childId: string;
  relationshipType?: string;
}

/** Normalize any incoming gender value to our canonical vocabulary. */
export function normalizeGender(g?: string | null): Gender {
  const s = (g ?? "").trim().toLowerCase();
  if (s === "female" || s === "male") return s;
  if (s === "other") return "other";
  return "";
}

/** An edge with no type or "biological" type counts as a biological parent link. */
export function isBiological(rel?: string): boolean {
  if (!rel) return true;
  return rel.trim().toLowerCase() === "biological";
}

/** Distinct non-empty partner ids of a union (skips the empty partner_b slot). */
export function unionParentIds(u: UnionRow): string[] {
  const out: string[] = [];
  if (u.partnerA && u.partnerA.trim() !== "") out.push(u.partnerA);
  if (u.partnerB && u.partnerB.trim() !== "") out.push(u.partnerB);
  return out;
}

/**
 * Returns the first role-conflict for every child whose known biological
 * parents include two women (mother) or two men (father). Adopted/step edges
 * are intentionally excluded — adoption and step-parenting are the legal way
 * to "add a second mother/father" and use a different-colored line.
 */
export function findDualParentConflicts(
  unions: UnionRow[],
  edges: EdgeRow[],
  genderById: Map<string, Gender>
): { childId: string; role: "mother" | "father" }[] {
  const byId = new Map(unions.map((u) => [u.id, u]));
  const childIds = new Set(edges.map((e) => e.childId));
  const out: { childId: string; role: "mother" | "father" }[] = [];

  for (const childId of Array.from(childIds)) {
    // Count DISTINCT persons per role — a parent who appears in more than one
    // union (remarriage) must not be counted twice.
    const females = new Set<string>();
    const males = new Set<string>();
    for (const e of edges) {
      if (e.childId !== childId || !isBiological(e.relationshipType)) continue;
      const u = byId.get(e.unionId);
      if (!u) continue;
      for (const pid of unionParentIds(u)) {
        const g = genderById.get(pid) ?? "other";
        if (g === "female") females.add(pid);
        else if (g === "male") males.add(pid);
      }
    }
    if (females.size > 1) out.push({ childId, role: "mother" });
    else if (males.size > 1) out.push({ childId, role: "father" });
  }
  return out;
}

/**
 * Client/server pre-check: would adding a NEW biological parent edge from
 * `newUnionId` to `childId` give that child a second biological mother or
 * father? Pass the FINAL shape of the unions (payload unions merged over DB)
 * and the DB's existing edges (the new edge is not in them yet).
 */
export function wouldCreateDualBiologicalParent(
  unions: UnionRow[],
  edges: EdgeRow[],
  genderById: Map<string, Gender>,
  childId: string,
  newUnionId: string,
  rel?: string
): "mother" | "father" | null {
  if (!isBiological(rel)) return null;

  const byId = new Map(unions.map((u) => [u.id, u]));
  const existingFemales = new Set<string>();
  const existingMales = new Set<string>();

  const countUnion = (uid: string, females: Set<string>, males: Set<string>) => {
    const u = byId.get(uid);
    if (!u) return;
    for (const pid of unionParentIds(u)) {
      const g = genderById.get(pid) ?? "other";
      if (g === "female") females.add(pid);
      else if (g === "male") males.add(pid);
    }
  };

  // Existing biological parent unions for the child (the same union being
  // re-added is skipped — that is a no-op dedup, not a second mother).
  for (const e of edges) {
    if (e.childId !== childId || e.unionId === newUnionId) continue;
    if (!isBiological(e.relationshipType)) continue;
    countUnion(e.unionId, existingFemales, existingMales);
  }
  const finalFemales = new Set(existingFemales);
  const finalMales = new Set(existingMales);
  countUnion(newUnionId, finalFemales, finalMales);

  if (finalFemales.size > 1) return "mother";
  if (finalMales.size > 1) return "father";
  return null;
}

/**
 * Pre-check for a PATCH that changes a person's gender: could the new gender
 * retroactively create two biological mothers/fathers for any of that
 * person's recorded children? Returns the offending role or null.
 */
export function wouldGenderChangeBreakRule(
  unions: UnionRow[],
  edges: EdgeRow[],
  genderById: Map<string, Gender>,
  personId: string,
  newGender: Gender
): "mother" | "father" | null {
  const byId = new Map(unions.map((u) => [u.id, u]));
  const children = new Set<string>();

  for (const e of edges) {
    if (!isBiological(e.relationshipType)) continue;
    const u = byId.get(e.unionId);
    if (!u) continue;
    if (u.partnerA === personId || u.partnerB === personId) children.add(e.childId);
  }
  if (children.size === 0) return null;

  const after = new Map(genderById);
  after.set(personId, newGender);

  for (const childId of Array.from(children)) {
    const females = new Set<string>();
    const males = new Set<string>();
    for (const e of edges) {
      if (e.childId !== childId || !isBiological(e.relationshipType)) continue;
      const u = byId.get(e.unionId);
      if (!u) continue;
      for (const pid of unionParentIds(u)) {
        const g = after.get(pid) ?? "other";
        if (g === "female") females.add(pid);
        else if (g === "male") males.add(pid);
      }
    }
    if (females.size > 1) return "mother";
    if (males.size > 1) return "father";
  }
  return null;
}
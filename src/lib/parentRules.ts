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

export interface Consolidation {
  unions: UnionRow[];
  edges: EdgeRow[];
  merged: { childId: string; fromUnionIds: string[]; intoUnionId: string }[];
}

/**
 * Auto-consolidates "two-line" bugs. Enforces the invariant: **a child has
 * exactly ONE biological parent-union**, drawn as a single line.
 *
 * Two distinct corruptions are repaired:
 *  A. A child with exactly two DISTINCT single-parent biological unions (each
 *     ONE partner, no partner_b) is merged into ONE couple union.
 *  B. A child whose biological parents are already fully represented by a
 *     COUPLE union but ALSO has a redundant attachment to a single-parent union
 *     (the "couple + lone-parent" duplicate) — the child's line is moved to the
 *     couple and the redundant single-parent attachment dropped.
 * Then any single-parent union left with NO child edges AND whose lone parent is
 * already in a couple union is removed (orphan cleanup), so it can't drift back
 * into client state on the next save.
 *
 * This is the permanent, server-side defence for the recurring bug where adding
 * a second biological parent produced a duplicate parent line. It runs on EVERY
 * save (all paths funnel through PUT /api/tree) and on client load, so it also
 * repairs already-corrupted trees on their next save.
 *
 * Pure + deterministic. Only merges legal mother+father (or unknown-gender)
 * couples — same-known-gender parents are left alone (still caught by the
 * dual-parent validation). returns the (maybe) reduced union/edge sets plus a
 * report of merges.
 */
export function consolidateSingleParentBiologicalUnions(
  unions: UnionRow[],
  edges: EdgeRow[],
  genderById?: Map<string, Gender>
): Consolidation {
  const outUnions = unions.map((u) => ({ ...u }));
  const outUnionsById = new Map(outUnions.map((u) => [u.id, u]));
  const outEdges = edges.map((e) => ({ ...e }));
  const merged: Consolidation["merged"] = [];

  const childIds = new Set(
    outEdges.filter((e) => isBiological(e.relationshipType)).map((e) => e.childId)
  );

  for (const childId of Array.from(childIds)) {
    // Gather this child's biological parent unions.
    const bioUnionIds: string[] = [];
    for (const e of outEdges) {
      if (e.childId !== childId) continue;
      if (isBiological(e.relationshipType) && outUnionsById.has(e.unionId)) {
        bioUnionIds.push(e.unionId);
      }
    }
    if (bioUnionIds.length < 2) continue; // single relationship already correct

    const couples = bioUnionIds.filter((id) => unionParentIds(outUnionsById.get(id)!).length === 2);
    const singleIds = bioUnionIds.filter((id) => unionParentIds(outUnionsById.get(id)!).length === 1);

    if (couples.length > 0) {
      // --- Case B: a couple union already represents this child's parents.
      // Re-point every bio attachment at the (first) couple.
      const intoId = couples[0];
      for (let i = outEdges.length - 1; i >= 0; i--) {
        const e = outEdges[i];
        if (e.childId !== childId || !isBiological(e.relationshipType)) continue;
        e.unionId = intoId;
      }
      // Then keep exactly ONE edge for this child.
      let seen = false;
      for (let i = outEdges.length - 1; i >= 0; i--) {
        const e = outEdges[i];
        if (e.childId !== childId || !isBiological(e.relationshipType)) continue;
        if (seen) outEdges.splice(i, 1);
        else seen = true;
      }
      merged.push({ childId, fromUnionIds: bioUnionIds.slice(), intoUnionId: intoId });
      continue;
    }

    // --- Case A: multiple single-parent biological unions.
    const parentSet = new Set<string>();
    for (const id of singleIds) {
      for (const p of unionParentIds(outUnionsById.get(id)!)) parentSet.add(p);
    }
    // Exactly two distinct parents across the single-parent unions.
    if (singleIds.length !== 2 || parentSet.size !== 2) continue;
    const [pA, pB] = Array.from(parentSet);
    if (genderById) {
      const gA = genderById.get(pA) ?? "other";
      const gB = genderById.get(pB) ?? "other";
      if ((gA === "female" && gB === "female") || (gA === "male" && gB === "male")) continue;
    }
    const sorted = singleIds.slice().sort();
    const intoId = sorted[0];
    const otherId = sorted[1];
    outUnionsById.get(intoId)!.partnerA = pA;
    outUnionsById.get(intoId)!.partnerB = pB;
    // Re-point every bio edge at the merged union.
    for (let i = outEdges.length - 1; i >= 0; i--) {
      const e = outEdges[i];
      if (e.childId !== childId || !isBiological(e.relationshipType)) continue;
      e.unionId = intoId;
    }
    // Then keep exactly ONE edge for this child.
    let seen = false;
    for (let i = outEdges.length - 1; i >= 0; i--) {
      const e = outEdges[i];
      if (e.childId !== childId || !isBiological(e.relationshipType)) continue;
      if (seen) outEdges.splice(i, 1);
      else seen = true;
    }
    const otherIdx = outUnions.findIndex((u) => u.id === otherId);
    if (otherIdx !== -1) outUnions.splice(otherIdx, 1);
    outUnionsById.delete(otherId);
    merged.push({ childId, fromUnionIds: [intoId, otherId], intoUnionId: intoId });
  }

  // Orphan cleanup: remove single-parent unions that (after consolidation) have
  // NO child edges and whose lone parent is already inside a couple union.
  const edgeCountByUnion = new Map<string, number>();
  for (const e of outEdges) edgeCountByUnion.set(e.unionId, (edgeCountByUnion.get(e.unionId) ?? 0) + 1);
  const parentInCouple = new Set<string>();
  for (const u of outUnions) {
    if (unionParentIds(u).length !== 2) continue;
    for (const p of unionParentIds(u)) parentInCouple.add(p);
  }
  for (let i = outUnions.length - 1; i >= 0; i--) {
    const u = outUnions[i];
    const parents = unionParentIds(u);
    if (parents.length !== 1) continue;
    if ((edgeCountByUnion.get(u.id) ?? 0) !== 0) continue; // still parents a child
    if (!parentInCouple.has(parents[0])) continue;          // genuine lone parent elsewhere
    outUnions.splice(i, 1);
    outUnionsById.delete(u.id);
  }

  return { unions: outUnions, edges: outEdges, merged };
}

/* ------------------------------------------------------------------ */
/* Self-partner guard: a person cannot be their own partner.           */
/* ------------------------------------------------------------------ */

export function hasSelfPartner(unions: { id?: string; partnerA: string; partnerB: string }[]): { unionId: string } | null {
  for (const u of unions) {
    if (u.partnerA && u.partnerA === u.partnerB) {
      return { unionId: u.id ?? "" };
    }
  }
  return null;
}
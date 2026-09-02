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
 * Auto-consolidates "two-line" bugs: when a child is attached to exactly two
 * DISTINCT single-parent biological unions (each with ONE partner and no
 * partner_b), merge them into ONE couple union so the child draws a single
 * line from the diamond's bottom node.
 *
 * This is the permanent, server-side defence for the bug where adding two
 * biological parents produced two single-parent unions (two lines from the
 * parent cards). It runs on EVERY save (all paths funnel through PUT /api/tree),
 * so it also repairs already-corrupted trees on their next save.
 *
 * Pure + deterministic: only touches bio edges of a child that resolve to two
 * distinct single-parent unions; leaves step/adopted and already-couple unions
 * alone. Returns the (maybe) reduced union/edge sets plus a report of merges.
 */
export function consolidateSingleParentBiologicalUnions(
  unions: UnionRow[],
  edges: EdgeRow[],
  genderById?: Map<string, Gender>
): Consolidation {
  const unionById = new Map(unions.map((u) => [u.id, u]));

  // Group single-parent unions (no partner_b) by their lone parent.
  const singleByParent = new Map<string, UnionRow[]>();
  for (const u of unions) {
    const parents = unionParentIds(u);
    if (parents.length !== 1) continue; // couple or empty — not a merge candidate
    const pid = parents[0];
    if (!singleByParent.has(pid)) singleByParent.set(pid, []);
    singleByParent.get(pid)!.push(u);
  }

  const outUnions = unions.map((u) => ({ ...u }));
  const outUnionsById = new Map(outUnions.map((u) => [u.id, u]));
  const outEdges = edges.map((e) => ({ ...e }));
  const merged: Consolidation["merged"] = [];

  // Collect children needing consolidation: those with bio edges to >=2 distinct
  // single-parent unions where the unions carry >=2 distinct parents total.
  const children = new Set(edges.filter((e) => isBiological(e.relationshipType)).map((e) => e.childId));

  for (const childId of Array.from(children)) {
    const singleUnions = new Map<string, UnionRow>(); // unionId -> union (single-parent only)
    const parents = new Set<string>();
    for (const e of edges) {
      if (e.childId !== childId || !isBiological(e.relationshipType)) continue;
      const u = unionById.get(e.unionId);
      if (!u) continue;
      const pu = unionParentIds(u);
      if (pu.length === 1) {
        singleUnions.set(u.id, u);
        parents.add(pu[0]);
      } else {
        // Already has a proper couple union among its bio parents — don't touch.
        singleUnions.clear();
        break;
      }
    }
    // Require exactly two single-parent unions and two distinct parents.
    if (singleUnions.size !== 2 || parents.size !== 2) continue;
    const [uA, uB] = Array.from(singleUnions.values());
    const [pA, pB] = Array.from(parents);
    // Safety: if both parents are the 'same gender' this would be a dual-parent
    // conflict, not something to silently auto-merge — skip (validation rejects it).
    if (genderById) {
      const gA = genderById.get(pA) ?? "other";
      const gB = genderById.get(pB) ?? "other";
      if ((gA === "female" && gB === "female") || (gA === "male" && gB === "male")) continue;
    }
    // Reuse one of the single-parent unions as the couple (the lower id, stable).
    const aId = uA.id;
    const bId = uB.id;
    const intoId = aId < bId ? aId : bId;
    const otherId = aId < bId ? bId : aId;
    const into = outUnionsById.get(intoId)!;
    into.partnerA = pA;
    into.partnerB = pB;
    // Collapse the child's bio edges onto the merged union, keeping ONE.
    const keptEdge: EdgeRow | null = outEdges.find(
      (e) => e.childId === childId && isBiological(e.relationshipType) && e.unionId === intoId
    ) ?? null;
    for (let i = outEdges.length - 1; i >= 0; i--) {
      const e = outEdges[i];
      if (e.childId !== childId || !isBiological(e.relationshipType)) continue;
      if (e.unionId === intoId && keptEdge) {
        if (outEdges[i] !== keptEdge) {
          outEdges.splice(i, 1);
        }
        continue;
      }
      e.unionId = intoId; // point the other single-parent edge at the merged union
    }
    // Now ensure only one edge remains for this child.
    let seen = false;
    for (let i = outEdges.length - 1; i >= 0; i--) {
      const e = outEdges[i];
      if (e.childId !== childId || !isBiological(e.relationshipType)) continue;
      if (seen) {
        outEdges.splice(i, 1);
      } else {
        seen = true;
      }
    }
    const otherIdx = outUnions.findIndex((u) => u.id === otherId);
    if (otherIdx !== -1) outUnions.splice(otherIdx, 1);
    outUnionsById.delete(otherId);
    merged.push({ childId, fromUnionIds: [aId, bId], intoUnionId: intoId });
  }

  return { unions: outUnions, edges: outEdges, merged };
}
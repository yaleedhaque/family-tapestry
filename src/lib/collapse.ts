// Sub-tree collapse for scaling the tree to thousands of nodes.
//
// The deterministic layered layout (manualFamilyLayout) is clean and straight-line
// but its width grows with the deepest, widest branch. Collapsing lets a user hide
// whole branches behind a single compact cluster card, so the visible portion stays
// small even when the underling data has thousands of people.
//
// This module is PURE (no React / no styling): it computes
//   - the visible subset of persons/unions/edges honouring collapsed unions,
//   - which unions are collapsible (have a child / descendant),
//   - how many people a collapsed union would hide (for the badge),
//   - a deterministic descendant-name sample for the cluster card.
//
// Collapse unit = a UNION (a couple). Collapsing a union hides that union's children
// and everything reachable below them, replacing them with a single cluster card.

export interface CollapsePerson {
  id: string;
  fullName: string;
}
export interface CollapseUnion {
  id: string;
  partnerA?: string | null;
  partnerB?: string | null;
}
export interface CollapseEdge {
  unionId: string;
  childId: string;
}

// Surrogate node id for a collapsed union. Cannot collide with real person/union
// ids (those are `p\d+` / uuids / `u\d+`).
export const surrogateIdFor = (unionId: string) => `__collapsed__${unionId}`;

export interface VisibleSubset {
  persons: string[]; // ids of visible real persons
  unions: string[]; // ids of visible real unions
  edges: CollapseEdge[]; // visible real parent→child edges
  collapsedEdges: CollapseEdge[]; // collapse boundary edges (union -> surrogate)
  collapseSubtree: Map<string, string[]>; // collapsed unionId -> ordered descendant person ids
}

function buildMaps(persons: CollapsePerson[], unions: CollapseUnion[], edges: CollapseEdge[]) {
  const childOf: Record<string, string | undefined> = {};
  const kidsOf: Record<string, string[]> = {};
  const unionsOf: Record<string, string[]> = {};
  const personById: Record<string, CollapsePerson> = {};
  for (const e of edges) {
    if (!e.childId) continue;
    childOf[e.childId] = e.unionId;
    (kidsOf[e.unionId] = kidsOf[e.unionId] || []).push(e.childId);
  }
  for (const k in kidsOf) kidsOf[k].sort();
  for (const u of unions) {
    if (u.partnerA) (unionsOf[u.partnerA] = unionsOf[u.partnerA] || []).push(u.id);
    if (u.partnerB) (unionsOf[u.partnerB] = unionsOf[u.partnerB] || []).push(u.id);
  }
  for (const k in unionsOf) unionsOf[k].sort();
  for (const p of persons) personById[p.id] = p;
  return { childOf, kidsOf, unionsOf, personById };
}

// All descendant person ids of a collapsed union — its children plus everything
// reachable below them (in-married spouses, their kids, etc.). `skipUnionId` is the
// collapsed union itself, so we never walk back up through the parent. Deterministic.
function descendantsFromKids(
  persons: CollapsePerson[],
  unions: CollapseUnion[],
  edges: CollapseEdge[],
  roots: string[],
  skipUnionId: string
): string[] {
  const { kidsOf, unionsOf, personById } = buildMaps(persons, unions, edges);
  const visitedP = new Set<string>();
  const visitedU = new Set<string>();
  const stack: string[] = [...roots];
  while (stack.length) {
    const pid = stack.pop()!;
    if (visitedP.has(pid)) continue;
    if (!personById[pid]) continue;
    visitedP.add(pid);
    for (const uid of unionsOf[pid] || []) {
      if (uid === skipUnionId || visitedU.has(uid)) continue;
      visitedU.add(uid);
      const u = unions.find((x) => x.id === uid);
      // include the spouse so the whole couple is counted as hidden
      if (u) {
        const other = u.partnerA === pid ? u.partnerB : u.partnerA;
        if (other && !visitedP.has(other) && personById[other]) stack.push(other);
      }
      for (const k of kidsOf[uid] || []) if (!visitedP.has(k)) stack.push(k);
    }
  }
  return Array.from(visitedP);
}

// Number of real persons hidden behind a collapsed union.
export function countHidden(
  persons: CollapsePerson[],
  unions: CollapseUnion[],
  edges: CollapseEdge[],
  unionId: string
): number {
  const { kidsOf } = buildMaps(persons, unions, edges);
  if (!(kidsOf[unionId] || []).length) return 0;
  return descendantsFromKids(persons, unions, edges, kidsOf[unionId], unionId).length;
}

// Up to `limit` descendant full-names for the cluster card preview.
export function sampleDescendantNames(
  persons: CollapsePerson[],
  unions: CollapseUnion[],
  edges: CollapseEdge[],
  unionId: string,
  limit = 5
): string[] {
  const { kidsOf, personById } = buildMaps(persons, unions, edges);
  const roots = kidsOf[unionId] || [];
  if (!roots.length) return [];
  const names: string[] = [];
  for (const pid of descendantsFromKids(persons, unions, edges, roots, unionId)) {
    const p = personById[pid];
    if (p && p.fullName) {
      names.push(p.fullName);
      if (names.length >= limit) break;
    }
  }
  return names;
}

export function collapsibleUnionIds(
  unions: CollapseUnion[],
  edges: CollapseEdge[]
): Set<string> {
  const set = new Set<string>();
  for (const e of edges) if (e.unionId) set.add(e.unionId);
  return set;
}

// Compute the visible person/union/edge lists given the set of collapsed union ids,
// plus the surrogate ("cluster") boundary edges and the hidden-subtree map.
//
// Model: a person is HIDDEN iff they lie inside the full descendant subtree of any
// collapsed union. The collapsed union itself stays rendered (it's the collapse
// anchor, and its marriage edges still point at its diamond); its real children are
// replaced by a single surrogate card. This works even for in-married spouses (who
// are tree "roots" in the layout) because they are reached through the collapsed
// union's subtree, not from the top.
export function visibleSubset(
  persons: CollapsePerson[],
  unions: CollapseUnion[],
  edges: CollapseEdge[],
  collapsed: ReadonlySet<string>
): VisibleSubset {
  const { kidsOf } = buildMaps(persons, unions, edges);

  // 1. Full descendant subtree (spouses + children) for each collapsed union.
  const collapseSubtree = new Map<string, string[]>();
  const hidden = new Set<string>();
  for (const u of unions) {
    if (!collapsed.has(u.id)) continue;
    const kids = kidsOf[u.id] || [];
    if (!kids.length) continue;
    const sub = descendantsFromKids(persons, unions, edges, kids, u.id);
    collapseSubtree.set(u.id, sub);
    for (const pid of sub) hidden.add(pid);
  }

  // 2. Visible persons = the complement of the hidden region.
  const visibleP = new Set<string>();
  for (const p of persons) if (!hidden.has(p.id)) visibleP.add(p.id);

  // 3. Visible unions: a collapsed union is rendered as an anchor ONLY when it is
  //    itself reachable (at least one partner visible); otherwise it's swallowed by
  //    an outer collapsed ancestor. Any other union renders when none of its
  //    partners is hidden.
  const isPersonVisible = (pid?: string | null) => !pid || !hidden.has(pid);
  const visibleU = new Set<string>();
  for (const u of unions) {
    if (collapsed.has(u.id)) {
      if (isPersonVisible(u.partnerA) || isPersonVisible(u.partnerB)) visibleU.add(u.id);
    } else if (isPersonVisible(u.partnerA) && isPersonVisible(u.partnerB)) {
      visibleU.add(u.id);
    }
  }

  // 4. Boundary edges (collapsed union -> surrogate).
  const collapsedEdges: CollapseEdge[] = [];
  for (const u of unions) {
    if (collapseSubtree.has(u.id) && visibleU.has(u.id)) {
      collapsedEdges.push({ unionId: u.id, childId: surrogateIdFor(u.id) });
    }
  }

  // 5. Visible real parent->child edges: keep an edge when its union is rendered,
  //    the union is not itself collapsed, and the child person is visible.
  const visibleEdges: CollapseEdge[] = [];
  for (const e of edges) {
    if (collapsed.has(e.unionId)) continue;
    if (!visibleU.has(e.unionId)) continue;
    if (!visibleP.has(e.childId)) continue;
    visibleEdges.push({ unionId: e.unionId, childId: e.childId });
  }

  // Defensive: if somehow nothing is visible (e.g. no roots), fall back to everyone.
  const personIds = visibleP.size ? Array.from(visibleP) : persons.map((p) => p.id);

  return {
    persons: personIds,
    unions: Array.from(visibleU),
    edges: visibleEdges,
    collapsedEdges,
    collapseSubtree,
  };
}
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";

export const GENERATION_COLORS = [
  "#C9A544",
  "#B5544A",
  "#4F8858",
  "#3F6E96",
  "#8A4F96",
  "#8A6F5C",
  "#585049",
];

/*  §6 — Ring colour = STATUS   --------------------------------------------
 *  The avatar ring on each person reflects their LIFE STATUS, not generation:
 *    - living    → golden  (var(--living-glow))
 *    - deceased  → grayish (var(--deceased-frame))
 *    - divorced  → reddish (var(--divorce-red))
 *  Precedence when a person is both deceased and was once divorced: deceased wins
 *  (a deceased person reads as deceased-gray, not as still "divorced-red").
 */
export type PersonRingStatus = "living" | "deceased" | "divorced";

export function personRingStatus(
  person: { isAlive: boolean; deathYear?: number | null; id?: string },
  unions: UnionLike[]
): PersonRingStatus {
  if (!person.isAlive || person.deathYear != null) return "deceased";
  const id = person.id;
  const divorced = !!id && unions.some(
    (u) => u.type === "divorced" && (u.partnerA === id || u.partnerB === id)
  );
  if (divorced) return "divorced";
  return "living";
}

export const STATUS_RING_COLORS: Record<PersonRingStatus, string> = {
  living: "var(--living-glow)",
  deceased: "var(--deceased-frame)",
  divorced: "var(--divorce-red)",
};

export function generationLabel(gen: number): string {
  switch (gen) {
    case 0: return "Generations";
    case 1: return "Grandparents & earlier";
    case 2: return "Parents";
    case 3: return "Siblings / this generation";
    case 4: return "Children";
    case 5: return "Grandchildren";
    default: return `Generation ${gen + 1}`;
  }
}

export function computeGenerationMap(
  persons: PersonLike[],
  unions: UnionLike[],
  parentEdges: EdgeLike[]
): Record<string, number> {
  const childOf = new Map<string, string>();
  for (const e of parentEdges) childOf.set(e.childId, e.unionId);

  const gen: Record<string, number> = {};
  const memo = new Map<string, number>();

  const depthOf = (id: string, visiting: Set<string>): number => {
    if (memo.has(id)) return memo.get(id)!;
    if (visiting.has(id)) return 0;
    visiting.add(id);
    let d = 0;
    const unionId = childOf.get(id);
    if (unionId) {
      const union = unions.find((u) => u.id === unionId);
      if (union) {
        const parentA = union.partnerA ? depthOf(union.partnerA, visiting) : -1;
        const parentB = union.partnerB ? depthOf(union.partnerB, visiting) : -1;
        const maxParent = Math.max(parentA, parentB);
        d = (maxParent < 0 ? 0 : maxParent + 1);
      }
    }
    visiting.delete(id);
    memo.set(id, d);
    return d;
  };

  // First pass: every person's generation from their lineage (parents' depth + 1).
  for (const p of persons) {
    gen[p.id] = depthOf(p.id, new Set());
  }

  // Second pass: spouse-alignment. A spouse who married INTO the family has no
  // parent edges, so they'd stay at gen 0 and their marriage line would stretch
  // diagonally across the whole tree. Align each spouse with their partner so
  // partners + their union always share one ELK layer → short, straight, flat
  // marriage lines. Uses a fixpoint so chains of couples converge; a partner who
  // is also a child keeps dragging their own children down correctly because we
  // raise (never lower) each person to the couple's maximum.
  let changed = true;
  const MAX_ITER = persons.length * unions.length * 2 + 10;
  let iter = 0;
  while (changed && iter < MAX_ITER) {
    changed = false;
    iter++;
    for (const u of unions) {
      const a = u.partnerA;
      const b = u.partnerB;
      if (!a || !b) continue;
      const ga = gen[a] ?? 0;
      const gb = gen[b] ?? 0;
      // Only collapse when they differ — raise the lower spouse to the higher.
      // We never lower, so lineage-bearing partners that are ALSO children aren't
      // dragged above their parents' band (that would misplace child edges).
      const target = Math.max(ga, gb);
      if (gen[a] !== target) { gen[a] = target; changed = true; }
      if (gen[b] !== target) { gen[b] = target; changed = true; }
    }
  }

  return gen;
}

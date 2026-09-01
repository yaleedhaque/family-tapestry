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
 *    - divorced  → reddish (var(--ember-red))
 *  Precedence when a person is both deceased and was once divorced: deceased wins
 *  (a deceased person reads as deceased-gray, not as still "divorced-red").
 */
export type PersonRingStatus = "living" | "deceased" | "divorced";

export function personRingStatus(
  person: { isAlive: boolean; id?: string },
  unions: UnionLike[]
): PersonRingStatus {
  if (!person.isAlive) return "deceased";
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
  divorced: "var(--ember-red)",
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

  for (const p of persons) {
    gen[p.id] = depthOf(p.id, new Set());
  }
  return gen;
}

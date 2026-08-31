import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";

export const GENERATION_COLORS = [
  "#C9A544",
  "#B5544A",
  "#7A9B76",
  "#7A8C9E",
  "#9E7A9E",
  "#8A6F5C",
  "#6E6553",
];

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

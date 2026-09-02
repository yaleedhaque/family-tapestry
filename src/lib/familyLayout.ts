// Family-tree layout.
//
// This file now delegates to the ELK-based engine (src/lib/layoutEngine.ts) — the
// permanent, overlap-free, scalable solution. The old hand-rolled "width-first
// reservation" algorithm was removed because it could not guarantee no overlaps as
// trees grow to thousands of people (see layoutEngine.ts header for the full story).
//
// `manualFamilyLayout` is kept as a thin async wrapper over `familyLayoutELK` to
// preserve the call contract used by TapestryCanvas and older tests.

import {
  familyLayoutELK,
  findOverlaps,
  type LayoutPerson,
  type LayoutUnion,
  type LayoutEdge,
  type LayoutResult,
  type LayoutMetrics,
} from "./layoutEngine";

export type { LayoutPerson, LayoutUnion, LayoutEdge, LayoutResult, LayoutMetrics };

// Async wrapper kept for backward-compatibility with the previous signature.
// `extras` lets callers ask for positions of ghost nodes (e.g. collapsed-cluster
// surrogate cards) that are not a person with their own union/edge.
export async function manualFamilyLayout(
  persons: LayoutPerson[],
  unions: LayoutUnion[],
  edges: LayoutEdge[],
  extras: { id: string }[] = []
): Promise<{ positions: Map<string, LayoutResult>; metrics: LayoutMetrics }> {
  return familyLayoutELK(persons, unions, edges, extras);
}

export { findOverlaps };

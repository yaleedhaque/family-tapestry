// Line-hop / bridge geometry + crossing detection for the family-tree edges.
//
// WHY: the layered layout minimizes crossings but cannot remove ALL of them
// (optimal edge-crossing minimization is NP-hard; remarriage / collapse-boundary
// edges join nodes with no strict ancestor/descendant layer relationship, so some
// crossings are structurally unavoidable). For those, the industry-standard answer
// is a "line hop"/"bridge": a small semicircular detour drawn on the line that must
// yield, so the two crossing lines read as independent rather than intersecting.
//
// This module is PURE (no React, no DOM): it exposes
//   - buildChildPath():  the exact orthogonal polyline FamilyChildEdge renders
//                        (reused by the hop pass so detect==render, never diverge)
//   - segmentsCross():   axis-aligned segment intersection (O(1) interval tests)
//   - edgeHopPriority(): deterministic yield order (§6.2 of the spec)
//   - computeHops():     for a set of child edges, which crossing point hops on which
//                        edge (lower-priority edge always yields; stable + idempotent)
//   - pathWithHops():    splice semicircular arcs into an edge's path string
//
// All segments are axis-aligned (horizontal or vertical), so intersection is cheap
// interval-overlap math — no general line-intersection solver needed.

export const HOP_R = 6; // hop arc radius (px)
export const HOP_PAIR_CAP = 5000; // max edge-pairs checked before skipping a pass

export interface Segment {
  // A horizontal segment: { y, x0, x1 } (x1 > x0). A vertical: { x, y0, y1 } (y1 > y0).
  x?: number;
  y?: number;
  x0?: number;
  x1?: number;
  y0?: number;
  y1?: number;
}

export interface OrthogonalPath {
  segments: Segment[];
}

export interface HopPoint {
  px: number;
  py: number;
  vertical: boolean; // true = the crossing sits on a vertical segment (arc bulges +X)
}

export interface ChildEdgeMeta {
  id: string; // edge id (must be unique + stable)
  isAdopted?: boolean;
  isStep?: boolean;
  generation: number; // child's generation (0 = root). Earlier gen = more prominent.
  remarriageBoundary?: boolean; // collapse/remarriage boundary edges always yield
  path: OrthogonalPath; // in the same world coords as React Flow sourceX/Y
}

const TRUNK = 14; // must match FamilyChildEdge's trunk length

// The same geometry FamilyChildEdge draws:
//   M sx,sy L sx,midY L tx,midY L tx,ty      (midY = sy + TRUNK)
export function buildChildPath(sx: number, sy: number, tx: number, ty: number): OrthogonalPath {
  const midY = sy + TRUNK;
  const segs: Segment[] = [];
  if (Math.abs(sy - midY) > 0.1) segs.push({ x: sx, y0: Math.min(sy, midY), y1: Math.max(sy, midY) });
  if (Math.abs(sx - tx) > 0.1) segs.push({ y: midY, x0: Math.min(sx, tx), x1: Math.max(sx, tx) });
  if (Math.abs(midY - ty) > 0.1) segs.push({ x: tx, y0: Math.min(midY, ty), y1: Math.max(midY, ty) });
  return { segments: mergeCollinear(segs) };
}

// Merge collinear same-axis segments (e.g. the source-trunk and target-drop verticals
// when the child is directly under its source) into single continuous segments, so a
// crossing at what would be a sub-segment seam is still detected as an INTERNAL cross.
function mergeCollinear(segs: Segment[]): Segment[] {
  const verts = segs
    .filter((s) => s.x != null)
    .map((s) => ({ x: s.x!, y0: s.y0!, y1: s.y1! }))
    .sort((a, b) => a.y0 - b.y0);
  const hozs = segs
    .filter((s) => s.y != null)
    .map((s) => ({ y: s.y!, x0: s.x0!, x1: s.x1! }))
    .sort((a, b) => a.x0 - b.x0);
  const out: Segment[] = [];
  for (const group of groupByKey(verts, (v) => v.x)) {
    group.sort((a, b) => a.y0 - b.y0);
    let cur = { ...group[0] };
    for (const g of group.slice(1)) {
      if (g.y0 <= cur.y1 + 1e-6) cur.y1 = Math.max(cur.y1, g.y1);
      else {
        out.push({ x: cur.x, y0: cur.y0, y1: cur.y1 });
        cur = { ...g };
      }
    }
    out.push({ x: cur.x, y0: cur.y0, y1: cur.y1 });
  }
  for (const group of groupByKey(hozs, (h) => h.y)) {
    group.sort((a, b) => a.x0 - b.x0);
    let cur = { ...group[0] };
    for (const g of group.slice(1)) {
      if (g.x0 <= cur.x1 + 1e-6) cur.x1 = Math.max(cur.x1, g.x1);
      else {
        out.push({ y: cur.y, x0: cur.x0, x1: cur.x1 });
        cur = { ...g };
      }
    }
    out.push({ y: cur.y, x0: cur.x0, x1: cur.x1 });
  }
  return out;
}

function groupByKey<T>(arr: T[], key: (t: T) => number): T[][] {
  const map = new Map<number, T[]>();
  for (const t of arr) {
    const k = key(t);
    const g = map.get(k);
    if (g) g.push(t);
    else map.set(k, [t]);
  }
  return Array.from(map.values());
}

// True if the two axis-aligned segments intersect at an internal point (not just
// touching an endpoint). Horizontal passes a vertical, or vice-versa.
export function segmentsCross(a: Segment, b: Segment): boolean {
  const h = a.y != null ? a : b;
  const v = a.y != null ? b : a;
  if (h.y == null || v.x == null) return false; // both same orientation: colinear, not a cross
  const hx0 = Math.min(h.x0!, h.x1!);
  const hx1 = Math.max(h.x0!, h.x1!);
  const vy0 = Math.min(v.y0!, v.y1!);
  const vy1 = Math.max(v.y0!, v.y1!);
  if (h.y <= vy0 + 1e-6 || h.y >= vy1 - 1e-6) return false; // vertical endpoint touch
  if (v.x <= hx0 + 1e-6 || v.x >= hx1 - 1e-6) return false; // horizontal endpoint touch
  return true;
}

export function crossingPoint(a: Segment, b: Segment): { px: number; py: number } | null {
  const h = a.y != null ? a : b;
  const v = a.y != null ? b : a;
  if (!segmentsCross(a, b)) return null;
  return { px: v.x!, py: h.y! };
}

// Is the given point on a VERTICAL segment of `path`? (i.e. did the crossing land on
// a vertical line of the edge being rendered, so its hop must bulge +X?)
export function isOnVertical(path: OrthogonalPath, px: number, py: number): boolean {
  for (const s of path.segments) {
    if (s.x == null) continue; // horizontal
    const y0 = Math.min(s.y0!, s.y1!);
    const y1 = Math.max(s.y0!, s.y1!);
    if (Math.abs(s.x - px) < 1e-6 && py >= y0 + 1e-6 && py <= y1 - 1e-6) return true;
  }
  return false;
}

// Deterministic "who yields" decision, per spec §6.2:
//   - remarriage/collapse-boundary edges ALWAYS yield (hop) against ordinary child lines
//   - adopted/step lines yield to biological (they're already dashed; keep them unbroken?)
//     -> per spec: biological OUTranks adopted/step, so adopted/step yield = get the hop.
//   - among same kind, the EARLIER generation reads as more prominent -> later yields
//   - final tiebreak: LOWER id (string sort) wins (drawn straight)
// Returns true if `a` yields to (hops under) `b`.
export function edgeShouldYield(a: ChildEdgeMeta, b: ChildEdgeMeta): boolean {
  const prio = (e: ChildEdgeMeta): number => {
    if (e.remarriageBoundary) return 3; // always yields (lowest priority)
    if (e.isAdopted || e.isStep) return 2; // yields to biological
    return 1; // biological child line
  };
  const pa = prio(a);
  const pb = prio(b);
  if (pa !== pb) return pa > pb; // higher class value = lower priority = yields
  if (a.generation !== b.generation) return a.generation > b.generation; // later gen yields
  return a.id > b.id; // deterministic tiebreak
}

// For a set of child edges, determine where hops are placed on EACH edge. The
// lower-priority edge of each crossing pair gets a hop at that crossing. Only
// internal intersections (not shared endpoints) count. Deterministic + idempotent:
// processes edges sorted by id, and pair order is canonical, so repeated calls give
// the same result regardless of input order.
export function computeHops(edges: ChildEdgeMeta[]): Map<string, HopPoint[]> {
  const byId = edges.slice().sort((a, b) => a.id.localeCompare(b.id));
  const hops = new Map<string, HopPoint[]>();
  // cheap spatial pre-filter: bucket edges by Y-range so we only test pairs whose
  // paths plausibly overlap (row bands), never the full N² edge cross product.
  const ylo = (e: ChildEdgeMeta) => e.path.segments.reduce(
    (m, s) => Math.min(m, s.y != null ? s.y : s.y0!), Infinity);
  const yhi = (e: ChildEdgeMeta) => e.path.segments.reduce(
    (m, s) => Math.max(m, s.y != null ? s.y : s.y1!), -Infinity);

  let pairs = 0;
  for (let i = 0; i < byId.length; i++) {
    for (let j = i + 1; j < byId.length; j++) {
      const a = byId[i];
      const b = byId[j];
      // skip pairs that can't share a Y band at all
      const aTop = ylo(a), aBot = yhi(a);
      const bTop = ylo(b), bBot = yhi(b);
      if (aBot < bTop || bBot < aTop) continue;
      pairs++;
      if (pairs > HOP_PAIR_CAP) break; // guardrail: never blow the main thread
      for (const sa of a.path.segments) {
        for (const sb of b.path.segments) {
          const c = crossingPoint(sa, sb);
          if (!c) continue;
          // assign the hop to the edge that yields (drawn under)
          const aYields = edgeShouldYield(a, b);
          const target = aYields ? a : b;
          const onVertical = isOnVertical(target.path, c.px, c.py);
          const arr = hops.get(target.id) ?? [];
          arr.push({ px: c.px, py: c.py, vertical: onVertical });
          hops.set(target.id, arr);
        }
      }
    }
  }
  // stable sort hops along the path (by y then x) so the renderer/arc-splice is stable
  for (const arr of Array.from(hops.values())) {
    arr.sort((p, q) => (p.py - q.py) || (p.px - q.px));
  }
  return hops;
}

// Build the SVG `d` string for a child edge path, splicing a semicircular hop at
// each hop point. Must be passed the same segments as buildChildPath so the hop
// lands exactly on the drawn polyline. `oppositeHopVerticals` lets an edge that
// crosses a vertical segment draw its horizontal hop correctly.
//
// For a hop on a HORIZONTAL segment (the common case): bulges DOWN (+y), sweep=1:
//   L (px-r),py  A r,r 0 0 1 (px+r),py  ...
// For a hop on a VERTICAL segment: bulges RIGHT (+x), sweep=1:
//   L px,(py-r)  A r,r 0 0 1 px,(py+r)  ...
export function pathWithHops(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  hops: HopPoint[]
): string {
  const midY = sy + TRUNK;
  const r = HOP_R;
  // Re-trace the canonical 4-point path, splicing arcs where a hop sits on it.
  // Points (in order): A=sx,sy ; B=sx,midY ; C=tx,midY ; D=tx,ty
  const onH = (px: number, py: number) =>
    Math.abs(py - midY) < 1e-6 && px >= Math.min(sx, tx) - 1e-6 && px <= Math.max(sx, tx) + 1e-6;
  const onV1 = (px: number, py: number) =>
    Math.abs(px - sx) < 1e-6 && py >= Math.min(sy, midY) - 1e-6 && py <= Math.max(sy, midY) + 1e-6;
  const onV2 = (px: number, py: number) =>
    Math.abs(px - tx) < 1e-6 && py >= Math.min(midY, ty) - 1e-6 && py <= Math.max(midY, ty) + 1e-6;

  // Split each straight command into pieces around any hop lying on that segment.
  const out: string[] = [`M ${sx},${sy}`];
  const pushH = (px: number, py: number, vertical: boolean) => {
    if (vertical) {
      // vertical jog -> bulge right (+x)
      out.push(`L ${px},${py - r}`, `A ${r},${r} 0 0 1 ${px},${py + r}`);
    } else {
      // horizontal jog -> bulge down (+y)
      out.push(`L ${px - r},${py}`, `A ${r},${r} 0 0 1 ${px + r},${py}`);
    }
  };

  // --- vertical segment 1: (sx,sy)->(sx,midY)
  const v1Hops = hops.filter((h) => onV1(h.px, h.py) && h.vertical);
  if (v1Hops.length) {
    const sorted = v1Hops.slice().sort((p, q) => p.py - q.py);
    const lo = sy;
    const hi = midY;
    for (const h of sorted) {
      if (h.py > lo + 1e-6 && h.py < hi - 1e-6) {
        out.push(`L ${sx},${h.py - r}`);
        out.push(`A ${r},${r} 0 0 1 ${sx},${h.py + r}`);
      }
    }
  } else {
    out.push(`L ${sx},${midY}`);
  }

  // --- horizontal segment: (sx,midY)->(tx,midY)
  const hHops = hops.filter((h) => onH(h.px, h.py) && !h.vertical);
  const sorted = hHops.slice().sort((p, q) => p.px - q.px);
  let px = sx;
  for (const h of sorted) {
    if (h.px > Math.min(sx, tx) + 1e-6 && h.px < Math.max(sx, tx) - 1e-6) {
      out.push(`L ${h.px - r},${midY}`);
      out.push(`A ${r},${r} 0 0 1 ${h.px + r},${midY}`);
      px = h.px + r;
    }
  }
  // continue from the last x toward tx
  out.push(`L ${tx},${midY}`);

  // --- vertical segment 2: (tx,midY)->(tx,ty)
  const v2Hops = hops.filter((h) => onV2(h.px, h.py) && h.vertical);
  if (v2Hops.length) {
    const s2 = v2Hops.slice().sort((p, q) => p.py - q.py);
    const lo = midY, hi = ty;
    for (const h of s2) {
      if (h.py > lo + 1e-6 && h.py < hi - 1e-6) {
        out.push(`L ${tx},${h.py - r}`);
        out.push(`A ${r},${r} 0 0 1 ${tx},${h.py + r}`);
      }
    }
  } else {
    out.push(`L ${tx},${ty}`);
  }
  return out.join(" ");
}

// Group-B foundation: a standalone "does this candidate move cause an edge crossing"
// check over orthogonal paths, reused by any downstream pass. Returns the first
// crossing point if the candidate path crosses any of `others`.
export function edgeWouldCross(path: OrthogonalPath, others: OrthogonalPath[]): { px: number; py: number } | null {
  for (const o of others) {
    for (const sa of path.segments) {
      for (const sb of o.segments) {
        const c = crossingPoint(sa, sb);
        if (c) return { px: c.px, py: c.py };
      }
    }
  }
  return null;
}

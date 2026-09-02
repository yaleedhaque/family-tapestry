// ELK-based family-tree layout with a classic genogram look (permanent no-overlap
// solution that ALSO keeps married couples side-by-side with a perfectly centred
// diamond and straight child drops).
//
// Why not the old flat "couple-node" ELK model? ELK's layered layout places every
// node (including the marriage diamond) as an independent non-overlapping box, so it
// guarantees no overlaps but CANNOT centre the diamond between its two partners nor
// keep the partners adjacent — ELK has no notion of "a couple must sit together".
//
// Why not the pre-ELK hand-rolled layout? It produced the exact look the user wants
// (partners side by side, diamond centred, single children dropped straight) but
// repeatedly generated overlapping cards as the tree grew (in-married spouses,
// remarriage, double-reserved subtree widths). It cannot scale safely.
//
// This engine MERGES the two:
//
//   1. COMPOUND MODEL (no-overlap at scale). Each couple union becomes a SINGLE
//      compound node in ELK's layered graph. ELK positions the whole couple as one
//      box, so it can never separate the partners nor run another card between them,
//      and overlaps are structurally impossible (ELK enforces spacing between
//      top-level blocks). A single-parent union stays a plain person -> child edge.
//        - couple compound  -> child   (parent->child, one layer down)
//      (no marriage-bar edges needed: the partners + diamond live INSIDE the compound)
//
//   2. MANUAL COMPOUND INTERNALS (the classic look). Inside each couple compound I
//      place, deterministically:
//                        [ partnerA  |  diamond  |  partnerB ]
//      side by side, with the diamond EXACTLY centred between the two partner
//      centres and all three vertically centred. No ELK internal layout — I set the
//      offsets myself, so spouses are always adjacent and the diamond always centred.
//
//   3. CHILD RECENTRING (straight drops, safely). After ELK lays out the top-level
//      boxes, free (non-spouse) child cards are recentred horizontally on their row
//      to sit under their parent diamond / single parent. The reposition is done as a
//      per-row balanced compaction that enforces min-spacing, so it never introduces
//      an overlap; couples (compounds) stay exactly where ELK put them.
//
// Positions returned are TOP-LEFT node coordinates (same contract as before), keyed by
// person id, union id, and any extra "ghost" node id passed in `extras`.

import ELK from "elkjs/lib/elk.bundled";
import type { ElkNode, ElkExtendedEdge, LayoutOptions } from "elkjs/lib/elk-api";

export interface LayoutPerson {
  id: string;
}
export interface LayoutUnion {
  id: string;
  partnerA?: string | null;
  partnerB?: string | null;
}
export interface LayoutEdge {
  unionId: string;
  childId: string;
}
export interface LayoutResult {
  x: number;
  y: number;
}
export interface LayoutMetrics {
  width: number;
  height: number;
}

export const LAYOUT_PERSON_W = 140; // real rendered card width  (PersonNode w-[140px])
export const LAYOUT_PERSON_H = 231; // real rendered card height (measured)
export const LAYOUT_UNION_W = 110; // real rendered union diamond width
export const LAYOUT_UNION_H = 150; // real rendered union diamond height
const GAP = 48;

// Width of a couple block when both partners are inside: [A | diamond | B]
const COUPLE_W = LAYOUT_PERSON_W + GAP + LAYOUT_UNION_W + GAP + LAYOUT_PERSON_W;

// One shared lazy ELK instance (reused across calls; elkjs `.layout()` is stateless
// w.r.t. the graph it is handed). Uses the in-process "fake worker" so it works in
// Node (tests) and webpack (browser) without a real Web Worker file.
let _elk: InstanceType<typeof ELK> | null = null;
function getElk() {
  if (!_elk) _elk = new ELK();
  return _elk;
}

const LAYER_OPTIONS: LayoutOptions = {
  "elk.algorithm": "org.eclipse.elk.layered",
  "elk.direction": "DOWN",
  "elk.layered.layering.strategy": "NETWORK_SIMPLEX",
  "elk.layered.nodePlacement.strategy": "BRANDES_KOEPF",
  "elk.layered.crossingMinimization.strategy": "LAYER_SWEEP",
  "elk.layered.considerModelOrder": "true",
  "elk.spacing.nodeNode": String(GAP),
  "elk.layered.spacing.nodeNodeBetweenLayers": "110",
  "elk.layered.spacing.edgeNodeBetweenLayers": "40",
  "elk.layered.spacing.edgeEdge": "20",
  "elk.edgeRouting": "ORTHOGONAL",
};

type ElkResult = Omit<ElkNode, "children"> & {
  children?: (ElkNode & { x?: number; y?: number })[];
};

/**
 * Async layout: ELK compound-per-couple engine.
 * @param extras any additional node ids (e.g. collapsed-cluster surrogate cards) that
 *   must get a position even though they are not a person with a union/edge of their own.
 */
export async function familyLayoutELK(
  persons: LayoutPerson[],
  unions: LayoutUnion[],
  edges: LayoutEdge[],
  extras: { id: string }[] = []
): Promise<{ positions: Map<string, LayoutResult>; metrics: LayoutMetrics }> {
  const couples = unions.filter((u) => u.partnerA && u.partnerB);

  // --- Assign each couple partner to a compound; a person who is a partner in more
  //     than one couple (remarriage) can only live in one compound -> stays flat.
  const personCompound = new Map<string, string>(); // person id -> "c_<unionId>"
  const multiCouple = new Set<string>();
  for (const u of couples) {
    for (const pid of [u.partnerA, u.partnerB]) {
      if (!pid) continue;
      const cid = compoundId(u.id);
      if (personCompound.has(pid)) multiCouple.add(pid);
      else personCompound.set(pid, cid);
    }
  }
  // People who are actually inside a compound (not a remarrying flat spouse).
  const seated = new Set<string>();
  for (const entry of Array.from(personCompound)) if (!multiCouple.has(entry[0])) seated.add(entry[0]);

  // --- Build the top-level ELK graph.
  const children: ElkNode[] = [];
  const elkEdges: ElkExtendedEdge[] = [];

  const compOf = new Map<string, string>(); // union id -> compound node id
  const extraIds = new Set<string>(extras.map((x) => x.id));

  for (const u of couples) {
    // Couple width: the compound holds both partners side-by-side with the diamond
    // centred between them.
    const width = COUPLE_W;
    const cid = compoundId(u.id);
    compOf.set(u.id, cid);
    children.push({ id: cid, width, height: LAYOUT_PERSON_H });
  }

  // Flat persons: not seated in a compound (remarrying spouses + everyone not a
  // couple partner) + ghost extras.
  const topNodeFor = (pid: string): string => {
    const c = personCompound.get(pid);
    return c && !multiCouple.has(pid) ? c : pid;
  };

  const flatNodes = new Set<string>();
  for (const p of persons) if (!seated.has(p.id)) flatNodes.add(p.id);
  for (const extra of extras) flatNodes.add(extra.id);
  for (const id of Array.from(extraIds)) flatNodes.add(id);
  for (const id of Array.from(flatNodes)) {
    children.push({ id, width: LAYOUT_PERSON_W, height: LAYOUT_PERSON_H });
  }

  // Parent->child edges at the top level (compound or flat person -> child).
  for (const ed of edges) {
    const union = unions.find((x) => x.id === ed.unionId);
    if (!union) continue;
    const source = union.partnerB ? compOf.get(union.id) : topNodeFor(union.partnerA!);
    const target = topNodeFor(ed.childId);
    if (!source || !target || source === target) continue;
    elkEdges.push({ id: `c_${ed.unionId}_${ed.childId}`, sources: [source], targets: [target] });
  }

  // Remarriage / multi-couple person : add marriage-bar edges between the compound
  // holding one partner and the flat partner, so ELK keeps them near.
  const edgeIdx = new Set<string>();
  for (const u of couples) {
    for (const pid of [u.partnerA, u.partnerB]) {
      if (!pid || !multiCouple.has(pid)) continue;
      const cid = compOf.get(u.id);
      // Arrangement: place the flat partner beside the compound via a marriage edge.
      if (cid) {
        const key = [cid, pid].sort().join("|");
        if (!edgeIdx.has(key)) {
          elkEdges.push({ id: `m_${u.id}_${pid}`, sources: [cid], targets: [pid] });
          edgeIdx.add(key);
        }
      }
    }
  }

  const empty = !children.length && !extras.length;
  if (empty) {
    return { positions: new Map(), metrics: { width: 800, height: 600 } };
  }

  const graph: ElkNode = {
    id: "family-root",
    layoutOptions: { ...LAYER_OPTIONS },
    children,
    edges: elkEdges,
  };

  const res = (await getElk().layout(graph)) as ElkResult;
  const top = new Map<string, { x: number; y: number; w: number }>();
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const n of res.children ?? []) {
    top.set(n.id, { x: n.x ?? 0, y: n.y ?? 0, w: n.width ?? 0 });
    if (n.x ?? 0 < minX) minX = n.x ?? 0;
    if ((n.y ?? 0) < minY) minY = n.y ?? 0;
    if ((n.x ?? 0) + (n.width ?? 0) > maxX) maxX = (n.x ?? 0) + (n.width ?? 0);
    if ((n.y ?? 0) + (n.height ?? 0) > maxY) maxY = (n.y ?? 0) + (n.height ?? 0);
  }
  if (minX === Infinity) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY = 600;
  }

  const positions = new Map<string, LayoutResult>();

  // --- Flat / ghost persons: direct positions.
  for (const id of Array.from(flatNodes)) {
    const t = top.get(id);
    positions.set(id, { x: t?.x ?? 0, y: t?.y ?? 0 });
  }

  // --- Compound internals: partners at the two ends, diamond centred between them.
  for (const u of couples) {
    const cid = compOf.get(u.id)!;
    const t = top.get(cid) ?? { x: 0, y: 0, w: COUPLE_W };
    const w = t.w || COUPLE_W;
    const aMulti = multiCouple.has(u.partnerA!);
    const bMulti = u.partnerB ? multiCouple.has(u.partnerB) : false;
    if (!aMulti && u.partnerA) positions.set(u.partnerA, { x: t.x, y: t.y });
    if (!bMulti && u.partnerB) positions.set(u.partnerB, { x: t.x + w - LAYOUT_PERSON_W, y: t.y });
    // Diamond centred between the two seated partner centres.
    const dCentre = aMulti ? t.x + LAYOUT_PERSON_W : bMulti ? t.x + w - LAYOUT_PERSON_W : t.x + w / 2;
    positions.set(u.id, {
      x: dCentre - LAYOUT_UNION_W / 2,
      y: t.y + (LAYOUT_PERSON_H - LAYOUT_UNION_H) / 2,
    });
  }

  // --- Child recentring: pull free (non-spouse) cards level under their parent so
  //     single children drop straight and multi-child fans centre on the parent.
  recentreChildren(positions, persons, unions, edges, seated, multiCouple);

  // --- Metrics over ALL laid-out boxes.
  let mMinX = Infinity,
    mMinY = Infinity,
    mMaxX = -Infinity,
    mMaxY = -Infinity;
  const rects: { id: string; x: number; y: number; w: number; h: number }[] = [];
  for (const p of persons) {
    const v = positions.get(p.id);
    if (v) {
      rects.push({ id: p.id, x: v.x, y: v.y, w: LAYOUT_PERSON_W, h: LAYOUT_PERSON_H });
      mMinX = Math.min(mMinX, v.x);
      mMinY = Math.min(mMinY, v.y);
      mMaxX = Math.max(mMaxX, v.x + LAYOUT_PERSON_W);
      mMaxY = Math.max(mMaxY, v.y + LAYOUT_PERSON_H);
    }
  }
  for (const u of couples) {
    const v = positions.get(u.id);
    if (v) {
      rects.push({ id: u.id, x: v.x, y: v.y, w: LAYOUT_UNION_W, h: LAYOUT_UNION_H });
      mMinX = Math.min(mMinX, v.x);
      mMinY = Math.min(mMinY, v.y);
      mMaxX = Math.max(mMaxX, v.x + LAYOUT_UNION_W);
      mMaxY = Math.max(mMaxY, v.y + LAYOUT_UNION_H);
    }
  }

  return {
    positions,
    metrics: {
      width: mMinX === Infinity ? 800 : mMaxX - mMinX,
      height: mMinY === Infinity ? 600 : mMaxY - mMinY,
    },
  };
}

function compoundId(unionId: string) {
  return `c_${unionId}`;
}

// ---------------------------------------------------------------------------
// Safe child recentring (straight child drops).
//
// After the compound pass, every box already has a non-overlapping position. This
// post-pass tries to pull FREE (non-spouse) child cards so they line up under their
// parent — single children drop straight, multi-child fans centre as a group under
// the parent. Children of the SAME parent are kept as a contiguous fan block, and
// each row is repacked left-to-right with enforced min spacing so the block order
// and spacing stay valid.
//
// Safety: a row is only committed if, after the moves, the WHOLE layout is still
// overlap-free (verified with findOverlaps). If the proposal would overlap anything
// (usually because a neighbouring independent family claims the same space) the row
// is reverted to ELK's guaranteed-clean positions. Consequently this pass can only
// make drops straighter; it can never introduce an overlap.
// ---------------------------------------------------------------------------
function recentreChildren(
  positions: Map<string, LayoutResult>,
  persons: LayoutPerson[],
  unions: LayoutUnion[],
  edges: LayoutEdge[],
  seated: Set<string>,
  multiCouple: Set<string>
): void {
  // Parent centre x for every free child: diamond centre (couple) or the single
  // parent person's centre.
  const parentCentre = new Map<string, number>();
  for (const ed of edges) {
    const u = unions.find((x) => x.id === ed.unionId);
    if (!u) continue;
    if (u.partnerB) {
      const d = positions.get(u.id);
      if (d) parentCentre.set(ed.childId, d.x + LAYOUT_UNION_W / 2);
    } else if (u.partnerA) {
      const p = positions.get(u.partnerA);
      if (p) parentCentre.set(ed.childId, p.x + LAYOUT_PERSON_W / 2);
    }
  }

  // Free nodes = persons not pinned inside a couple compound / not a remarrying
  // spouse. These are the only cards we may move (spouses are structurally placed).
  const freeIds = new Set<string>();
  for (const p of persons) {
    if (!seated.has(p.id) && !multiCouple.has(p.id)) freeIds.add(p.id);
  }

  // Group free children by parent union so a fan stays together and centres as a
  // single block under the parent. `cardParentGroup` maps each free child to the id
  // of the first parent union that produces it (so grouped cards aren't duplicated).
  const cardParentGroup = new Map<string, string>();
  for (const ed of edges) {
    if (!freeIds.has(ed.childId) || cardParentGroup.has(ed.childId)) continue;
    cardParentGroup.set(ed.childId, ed.unionId);
  }

  // Row bucket -> list of free child ids on that row (left-to-right).
  const rowBuckets = new Map<number, string[]>();
  for (const id of Array.from(freeIds)) {
    const v = positions.get(id);
    if (!v) continue;
    const row = Math.round((v.y + LAYOUT_PERSON_H / 2) / ROW_STEP);
    let arr = rowBuckets.get(row);
    if (!arr) rowBuckets.set(row, (arr = []));
    arr.push(id);
  }
  for (const arr of Array.from(rowBuckets.values()))
    arr.sort((a, b) => positions.get(a)!.x - positions.get(b)!.x);

  for (const ids of Array.from(rowBuckets.values())) {
    // Assemble fan blocks for this row: cards sharing one parent-union become a
    // single contiguous block that wants to centre at the parent's x.
    const blockById = new Map<string, { ids: string[]; target: number; width: number }>();
    for (const id of ids) {
      if (blockById.has(id)) continue;
      const g = cardParentGroup.get(id);
      const blockIds: string[] = [];
      let target = positionCenter(positions, id);
      let width = LAYOUT_PERSON_W;
      if (g) {
        for (const other of ids) {
          if (cardParentGroup.get(other) === g && positions.has(other)) blockIds.push(other);
        }
        target = parentCentre.get(blockIds[0]) ?? positionCenter(positions, id);
        width = blockIds.length * LAYOUT_PERSON_W + (blockIds.length - 1) * GAP;
      } else {
        blockIds.push(id);
      }
      const blk = { ids: blockIds, target, width };
      for (const m of blockIds) blockById.set(m, blk);
    }

    // Unique blocks in row order (by their left-most card).
    const blocks = Array.from(blockById.values()).filter(
      (b, i, self) => self.findIndex((x) => x.ids[0] === b.ids[0]) === i
    );
    blocks.sort(
      (a, b) => (positions.get(a.ids[0])?.x ?? 0) - (positions.get(b.ids[0])?.x ?? 0)
    );

    // Lay blocks left-to-right honouring targets where space allows, enforcing min
    // gap so blocks never overlap. Card x within a block is the fan order (ids are
    // already sorted by ascending current x -> left-to-right fan).
    const placed: { block: (typeof blocks)[number]; cx: number }[] = [];
    let rightEdge = -Infinity;
    for (const b of blocks) {
      const idealLeft = b.target - b.width / 2;
      const left = rightEdge === -Infinity ? idealLeft : Math.max(idealLeft, rightEdge + GAP);
      placed.push({ block: b, cx: left + b.width / 2 });
      rightEdge = left + b.width;
    }

    for (const p of placed) {
      const { block, cx } = p;
      const oldX = new Map<string, number>();
      for (const id of block.ids) oldX.set(id, positions.get(id)!.x);
      let x = cx - block.width / 2;
      for (const id of block.ids) {
        const v = positions.get(id);
        if (v) v.x = x;
        x += LAYOUT_PERSON_W + GAP;
      }
      // Revert THIS block only if its new placement overlaps any other box on its
      // row (e.g. a couple-compound / pinned spouse that occupies part of the span).
      if (blockCollides(positions, persons, unions, block.ids)) {
        for (const id of block.ids) positions.get(id)!.x = oldX.get(id)!;
      }
    }
  }
}

// True if the cards in `ids` (already moved) now overlap any OTHER person/diamond
// box that sits on the same row. Couple compounds' diamonds and all persons are
// considered; the moved cards themselves are excluded.
function blockCollides(
  positions: Map<string, LayoutResult>,
  persons: { id: string }[],
  unions: LayoutUnion[],
  ids: string[]
): boolean {
  const moved = new Set<string>(ids);
  const bounds: { id: string; x: number; y: number; w: number; h: number }[] = [];
  for (const p of persons) {
    if (moved.has(p.id)) continue;
    const v = positions.get(p.id);
    if (v) bounds.push({ id: p.id, x: v.x, y: v.y, w: LAYOUT_PERSON_W, h: LAYOUT_PERSON_H });
  }
  for (const u of unions) {
    if (!u.partnerB) continue;
    if (moved.has(u.id)) continue;
    const v = positions.get(u.id);
    if (v) bounds.push({ id: u.id, x: v.x, y: v.y, w: LAYOUT_UNION_W, h: LAYOUT_UNION_H });
  }
  // the moved block's bounding box
  let minX = Infinity,
    maxX = -Infinity;
  const y = positions.get(ids[0])?.y ?? 0;
  for (const id of ids) {
    const v = positions.get(id)!;
    minX = Math.min(minX, v.x);
    maxX = Math.max(maxX, v.x + LAYOUT_PERSON_W);
  }
  for (const b of bounds) {
    const sameRow = Math.abs(b.y - y) < LAYOUT_PERSON_H - 1;
    if (!sameRow) continue;
    const ox = Math.min(maxX, b.x + b.w) - Math.max(minX, b.x);
    if (ox > 0) return true;
  }
  return false;
}

function positionCenter(positions: Map<string, LayoutResult>, id: string): number {
  const v = positions.get(id);
  return v ? v.x + LAYOUT_PERSON_W / 2 : 0;
}

const ROW_STEP = 410;

// Exact axis-aligned bounding-box overlap detection for a completed layout.
// Returns overlapping pairs of the form `a x b (oxW x oyH)`. Uses real rendered
// dimensions (PERSON_W/H, UNION_W/H) so it is THE authoritative no-overlap check
// regardless of how deep/wide the tree grows.
export function findOverlaps(
  positions: Map<string, LayoutResult>,
  persons: { id: string }[],
  unions: { id: string; partnerA?: string | null; partnerB?: string | null }[]
): string[] {
  const rects: { id: string; x: number; y: number; w: number; h: number }[] = [];
  for (const p of persons) {
    const pos = positions.get(p.id);
    if (pos) rects.push({ id: p.id, x: pos.x, y: pos.y, w: LAYOUT_PERSON_W, h: LAYOUT_PERSON_H });
  }
  for (const u of unions) {
    if (!u.partnerB) continue;
    const pos = positions.get(u.id);
    if (pos) rects.push({ id: u.id, x: pos.x, y: pos.y, w: LAYOUT_UNION_W, h: LAYOUT_UNION_H });
  }
  const hits: string[] = [];
  for (let i = 0; i < rects.length; i++) {
    const a = rects[i];
    for (let j = i + 1; j < rects.length; j++) {
      const b = rects[j];
      const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ox > 0 && oy > 0) hits.push(`${a.id} x ${b.id} (${ox.toFixed(0)}x${oy.toFixed(0)})`);
    }
  }
  return hits;
}

// Manual layered family-tree layout.
//
// Produces clean, professional trees:
//   - Partners sit side by side with their union diamond EXACTLY centred between them.
//   - A union's children are centred under that union's diamond, so every single
//     child edge is a perfectly straight vertical drop; multiple children fan
//     symmetrically.
//   - Generation rows are computed by tree depth (no ELK). Re-marriages (a person
//     in several unions) fan the shared person's unions left and right around them.
//
// Coordination is width-first: each union's subtree reserves the horizontal room it
// needs (its children's widths) before anything is placed, so blocks never collide.
//
// Positions returned are TOP-LEFT node coordinates (not centres).

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

const PERSON_W = 210;
const PERSON_H = 231;
const UNION_W = 110;
const UNION_H = 150;
const GAP = 48;
const ROW = 300;
const HALF = GAP + 26 + PERSON_W / 2; // GAP + UNION_W/2 + PERSON_W/2

export function manualFamilyLayout(
  persons: LayoutPerson[],
  unions: LayoutUnion[],
  edges: LayoutEdge[]
): { positions: Map<string, LayoutResult>; metrics: LayoutMetrics } {
  // ----- helpers -----------------------------------------------------------
  const childOf: Record<string, string> = {};
  for (const e of edges) if (e.childId) childOf[e.childId] = e.unionId;

  const kidsOf: Record<string, string[]> = {};
  for (const e of edges) {
    if (!e.unionId) continue;
    (kidsOf[e.unionId] = kidsOf[e.unionId] || []).push(e.childId);
  }
  for (const k in kidsOf) kidsOf[k].sort();

  const unionsOf: Record<string, string[]> = {};
  for (const u of unions) {
    if (!u.partnerB) continue;
    if (u.partnerA) (unionsOf[u.partnerA] = unionsOf[u.partnerA] || []).push(u.id);
    if (u.partnerB) (unionsOf[u.partnerB] = unionsOf[u.partnerB] || []).push(u.id);
  }
  for (const k in unionsOf) unionsOf[k].sort();

  const coupleRow = (u: LayoutUnion) =>
    u.partnerA && u.partnerB ? PERSON_W + GAP + UNION_W + GAP + PERSON_W : PERSON_W + UNION_W + GAP;

  // ----- horizontal widths (bottom-up, cached) -----------------------------
  const spanU: Record<string, number> = {};
  const spanKid: Record<string, number> = {};

  const unionSpanOf = (u: LayoutUnion | string): number => {
    const un = typeof u === "string" ? unions.find((x) => x.id === u) : u;
    if (!un) return PERSON_W;
    if (spanU[un.id] !== undefined) return spanU[un.id];
    const cw = coupleRow(un);
    const ks = kidsOf[un.id] || [];
    if (!ks.length) {
      spanU[un.id] = cw;
      return cw;
    }
    let kidsW = 0;
    for (const k of ks) kidsW += kidSpan(k, un.id) + GAP;
    kidsW -= GAP;
    spanU[un.id] = Math.max(cw, kidsW);
    return spanU[un.id];
  };
  const kidSpan = (k: string, parentU: string): number => {
    const key = parentU + "|" + k;
    if (spanKid[key] !== undefined) return spanKid[key];
    const ms = (unionsOf[k] || []).filter((uid) => uid !== parentU);
    let w = ms.length ? 0 : PERSON_W;
    for (const uid of ms) w += unionSpanOf(uid);
    spanKid[key] = Math.max(w, PERSON_W);
    return spanKid[key];
  };

  // ----- placement ----------------------------------------------------------
  const pX: Record<string, number> = {};
  const pY: Record<string, number> = {};
  const dX: Record<string, number> = {};
  const dY: Record<string, number> = {};
  const placedP: Record<string, boolean> = {};
  const placedU: Record<string, boolean> = {};

  const placeChild = (k: string, genLevel: number, centerX: number, parentU: string) => {
    if (placedP[k]) return;
    placedP[k] = true;
    pX[k] = centerX;
    pY[k] = genLevel * ROW;
    let c = centerX;
    let prevSp = 0;
    for (const uid of unionsOf[k] || []) {
      if (uid === parentU || placedU[uid]) continue;
      const sp = unionSpanOf(uid);
      c = prevSp ? c + prevSp / 2 + sp / 2 + GAP : centerX + HALF;
      placeUnionRec(unions.find((u) => u.id === uid), genLevel, c, false);
      prevSp = sp;
    }
  };

  const placeKidsOf = (u: LayoutUnion, genLevel: number, sc: number) => {
    const ks = kidsOf[u.id] || [];
    if (!ks.length) return;
    if (ks.length === 1) {
      placeChild(ks[0], genLevel, sc, u.id);
      return;
    }
    let total = 0;
    const kw: Record<string, number> = {};
    for (const k of ks) {
      const w = kidSpan(k, u.id);
      kw[k] = w;
      total += w + GAP;
    }
    total -= GAP;
    let x0 = sc - total / 2;
    for (const k of ks) {
      const married = (unionsOf[k] || []).some((uid) => uid !== u.id && !placedU[uid]);
      const cx = married ? x0 + PERSON_W / 2 : x0 + kw[k] / 2;
      placeChild(k, genLevel, cx, u.id);
      x0 += kw[k] + GAP;
    }
  };

  const placeUnionRec = (
    u: LayoutUnion | undefined,
    genLevel: number,
    centerX: number,
    reversed?: boolean
  ) => {
    if (!u || !u.partnerB) return;
    if (placedU[u.id]) return;
    placedU[u.id] = true;
    const aOff = reversed ? HALF : -HALF;
    const bOff = reversed ? -HALF : HALF;
    if (u.partnerA && !placedP[u.partnerA]) {
      placedP[u.partnerA] = true;
      pX[u.partnerA] = centerX + aOff;
      pY[u.partnerA] = genLevel * ROW;
    }
    if (u.partnerB && !placedP[u.partnerB]) {
      placedP[u.partnerB] = true;
      pX[u.partnerB] = centerX + bOff;
      pY[u.partnerB] = genLevel * ROW;
    }
    dX[u.id] = centerX;
    dY[u.id] = genLevel * ROW;
    placeKidsOf(u, genLevel + 1, centerX);
  };

  // roots: people with no parent edge (incl. in-married spouses)
  const roots = persons.filter((p) => !childOf[p.id]);
  roots.sort((a, b) => (a.id < b.id ? -1 : 1));

  let cursor = 30;
  for (const r of roots) {
    if (placedP[r.id]) continue;
    const us = (unionsOf[r.id] || []).filter((uid) => !placedU[uid]);
    if (!us.length) {
      placedP[r.id] = true;
      pX[r.id] = cursor + PERSON_W / 2;
      pY[r.id] = 0;
      cursor += PERSON_W + GAP;
      continue;
    }
    if (us.length === 1) {
      const sp = unionSpanOf(us[0]);
      placeUnionRec(unions.find((u) => u.id === us[0]), 0, cursor + sp / 2, false);
      cursor += sp + GAP;
      continue;
    }
    // re-marrying person: shared person in the middle, unions fan left/right
    const leftUs: string[] = [];
    const rightUs: string[] = [];
    us.forEach((uid, idx) => (idx % 2 === 0 ? leftUs : rightUs).push(uid));
    const halfFan = HALF + 160;
    const personCx = cursor + Math.max(0, unionSpanOf(leftUs[0])) + PERSON_W / 2 + GAP;
    placedP[r.id] = true;
    pX[r.id] = personCx;
    pY[r.id] = 0;
    let xLeft = personCx - halfFan;
    let prevLSp = 0;
    const leftOrder = leftUs.slice().reverse();
    for (let i = 0; i < leftOrder.length; i++) {
      const uid = leftOrder[i];
      const sp = unionSpanOf(uid);
      if (i > 0) xLeft -= prevLSp / 2 + sp / 2 + GAP;
      placeUnionRec(unions.find((u) => u.id === uid), 0, xLeft, true);
      prevLSp = sp;
    }
    let xRight = personCx + halfFan;
    let prevRSp = 0;
    for (let i = 0; i < rightUs.length; i++) {
      const uid = rightUs[i];
      const sp = unionSpanOf(uid);
      if (i > 0) xRight += prevRSp / 2 + sp / 2 + GAP;
      placeUnionRec(unions.find((u) => u.id === uid), 0, xRight, false);
      prevRSp = sp;
    }
    cursor = xRight + (rightUs.length ? prevRSp / 2 : halfFan) + GAP;
  }

  // any unplaced person (defensive): lone box in its own row slot
  let maxY = 0;
  for (const p of persons) {
    if (!placedP[p.id]) {
      pX[p.id] = cursor + PERSON_W / 2;
      pY[p.id] = 0;
      placedP[p.id] = true;
      cursor += PERSON_W + GAP;
    }
    if ((pY[p.id] || 0) > maxY) maxY = pY[p.id];
  }

  // ----- convert centres → top-left + metrics ------------------------------
  const positions = new Map<string, LayoutResult>();
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY2 = -Infinity;
  for (const p of persons) {
    const x = (pX[p.id] || 0) - PERSON_W / 2;
    const y = (pY[p.id] || 0) - PERSON_H / 2;
    positions.set(p.id, { x, y });
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + PERSON_W > maxX) maxX = x + PERSON_W;
    if (y + PERSON_H > maxY2) maxY2 = y + PERSON_H;
  }
  for (const u of unions) {
    if (!u.partnerB || dX[u.id] === undefined) continue;
    const x = dX[u.id] - UNION_W / 2;
    const y = dY[u.id] - UNION_H / 2;
    positions.set(u.id, { x, y });
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x + UNION_W > maxX) maxX = x + UNION_W;
    if (y + UNION_H > maxY2) maxY2 = y + UNION_H;
  }
  if (positions.size === 0) {
    minX = 0;
    minY = 0;
    maxX = 800;
    maxY2 = 600;
  }

  return {
    positions,
    metrics: { width: maxX - minX, height: maxY2 - minY },
  };
}
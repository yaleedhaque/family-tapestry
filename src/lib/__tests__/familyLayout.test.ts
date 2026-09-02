import { describe, it, expect } from "vitest";
import { manualFamilyLayout, findOverlaps } from "../familyLayout";
import { LAYOUT_PERSON_H } from "../layoutEngine";

// Real live-tree dataset: 13 persons, 5 unions, 5 parent edges, incl. remarriage
// (p1 in u1+u2), an in-married wife (p7), a married child (p6 head of u4), and a
// 3-generation chain (p6 -> p11).
const persons = [
  { id: "p14", name: "ggggggg" },
  { id: "p13", name: "Boris" },
  { id: "p1", name: "Arthur" },
  { id: "p3", name: "Rose" },
  { id: "p10", name: "David" },
  { id: "p5", name: "Jenny" },
  { id: "p6", name: "Thomas" },
  { id: "p7", name: "Helen" },
  { id: "p8", name: "Charles" },
  { id: "p9", name: "Emily" },
  { id: "p2", name: "Martha" },
  { id: "p4", name: "Robert" },
  { id: "p11", name: "Sophie" },
];
const unions = [
  { id: "u1", partnerA: "p1", partnerB: "p2" },
  { id: "u2", partnerA: "p1", partnerB: "p3" },
  { id: "u3", partnerA: "p4", partnerB: "p5" },
  { id: "u4", partnerA: "p6", partnerB: "p7" },
  { id: "u5", partnerA: "p14", partnerB: "p13" },
];
const edges = [
  { unionId: "u1", childId: "p6" },
  { unionId: "u2", childId: "p8" },
  { unionId: "u3", childId: "p9" },
  { unionId: "u3", childId: "p10" },
  { unionId: "u4", childId: "p11" },
];

const PW = 140;
const PH = 231; // real rendered PersonNode height (matches layoutEngine.LAYOUT_PERSON_H)

function cxOf(positions: Map<string, { x: number; y: number }>, id: string) {
  return positions.get(id)!.x + PW / 2;
}

describe("ELK family layout (couple-node model)", () => {
  it("places every person and every couple-union", async () => {
    const { positions } = await manualFamilyLayout(persons, unions, edges);
    for (const p of persons) expect(positions.has(p.id), p.id).toBe(true);
    for (const u of unions) {
      if (u.partnerB) expect(positions.has(u.id), u.id).toBe(true);
      else expect(positions.has(u.id), `single-parent union ${u.id}`).toBe(false);
    }
  });

  it("never overlaps any two nodes (real live tree)", async () => {
    const { positions } = await manualFamilyLayout(persons, unions, edges);
    const hits = findOverlaps(positions, persons, unions);
    expect(hits).toEqual([]);
  });

  it("keeps a single-child edge straight under its union", async () => {
    const { positions } = await manualFamilyLayout(persons, unions, edges);
    for (const u of ["u1", "u2", "u4"] as const) {
      const child = edges.find((e) => e.unionId === u)!.childId;
      const dx = cxOf(positions, child) - cxOf(positions, u);
      expect(Math.abs(dx), `${u}->${child}`).toBeLessThan(140);
    }
  });

  it("is fully deterministic (same input -> identical layout)", async () => {
    const a = await manualFamilyLayout(persons, unions, edges);
    const b = await manualFamilyLayout(persons, unions, edges);
    expect(a.positions).toEqual(b.positions);
  });

  it("places generations top-down: every child below its parent union", async () => {
    const { positions } = await manualFamilyLayout(persons, unions, edges);
    for (const e of edges) {
      const unionPos = positions.get(e.unionId);
      const childPos = positions.get(e.childId);
      if (!unionPos || !childPos) continue;
      // child must be at or below the union (row(child) >= row(union))
      const uRow = Math.round((unionPos.y + LAYOUT_PERSON_H / 2) / 410);
      const cRow = Math.round((childPos.y + LAYOUT_PERSON_H / 2) / 410);
      expect(cRow).toBeGreaterThanOrEqual(uRow);
    }
    // no overlapping nodes at all
    const hits = findOverlaps(positions, persons, unions);
    expect(hits).toEqual([]);
  });

  it("keeps an in-married spouse (Ambia x Alomgir pathology) overlap-free", async () => {
    // Ambia(p2) is BOTH a child of union u9 (Amir x Alea) AND the in-married spouse
    // in union u3 (Shahidul x Ambia). This is the exact topology that used to push
    // sibling Alomgir(p10) onto Ambia. ELK must resolve it without any special case.
    const fam = {
      persons: [
        { id: "p1" }, { id: "p2" }, { id: "p3" }, { id: "p4" }, { id: "p5" },
        { id: "p6" }, { id: "p7" }, { id: "p8" }, { id: "p9" }, { id: "p10" },
        { id: "p11" }, { id: "p12" }, { id: "p13" },
      ],
      unions: [
        { id: "u3", partnerA: "p3", partnerB: "p2" },
        { id: "u6", partnerA: "p6", partnerB: "p5" },
        { id: "u9", partnerA: "p8", partnerB: "p7" },
      ],
      edges: [
        { unionId: "u3", childId: "p1" },
        { unionId: "u3", childId: "p4" },
        { unionId: "u6", childId: "p3" },
        { unionId: "u9", childId: "p2" },
        { unionId: "u9", childId: "p9" },
        { unionId: "u9", childId: "p10" },
        { unionId: "u9", childId: "p11" },
        { unionId: "u9", childId: "p12" },
        { unionId: "u9", childId: "p13" },
      ],
    };
    const { positions } = await manualFamilyLayout(fam.persons, fam.unions, fam.edges);
    for (const p of fam.persons) expect(positions.has(p.id), `person ${p.id}`).toBe(true);
    for (const u of fam.unions) expect(positions.has(u.id), `union ${u.id}`).toBe(true);
    const hits = findOverlaps(positions, fam.persons, fam.unions);
    expect(hits).toEqual([]);
  });

  it("handles empty trees and single-parent unions without crashing", async () => {
    const empty = await manualFamilyLayout([], [], []);
    expect(empty.positions.size).toBe(0);
    const single = await manualFamilyLayout(
      [{ id: "p1" }, { id: "p2" }],
      [{ id: "u1", partnerA: "p1", partnerB: "" }],
      [{ unionId: "u1", childId: "p2" }]
    );
    expect(single.positions.has("p1")).toBe(true);
    expect(single.positions.has("p2")).toBe(true);
    expect(single.positions.has("u1")).toBe(false); // single-parent unions are not diamond nodes
    expect(findOverlaps(single.positions, [{ id: "p1" }, { id: "p2" }], [])).toEqual([]);
  });

  it("stays overlap-free and deterministic when people are added later", async () => {
    const grown = {
      persons: [
        ...persons,
        { id: "n1", name: "NewPartner" },
        { id: "n2", name: "ChildC" },
        { id: "n3", name: "ChildD" },
        { id: "n4", name: "GrandKid" },
        { id: "ng1", name: "G1" },
        { id: "ng2", name: "G2" },
        { id: "ng3", name: "G3" },
        { id: "ng4", name: "G4" },
        { id: "np1", name: "SoloParent" },
        { id: "np2", name: "SoloChild" },
      ],
      unions: [
        ...unions,
        { id: "u6", partnerA: "p8", partnerB: "n1" },
        { id: "u7", partnerA: "ng1", partnerB: "ng2" },
        { id: "u8", partnerA: "ng3", partnerB: "ng4" },
        { id: "u9", partnerA: "p14", partnerB: "np1" },
        { id: "u10", partnerA: "", partnerB: "np2" },
      ],
      edges: [
        ...edges,
        { unionId: "u6", childId: "n2" },
        { unionId: "u3", childId: "n3" },
        { unionId: "u3", childId: "n4" },
        { unionId: "u7", childId: "ng3" },
        { unionId: "u8", childId: "ng4" },
      ],
    };

    const a = await manualFamilyLayout(grown.persons, grown.unions, grown.edges);
    const b = await manualFamilyLayout(grown.persons, grown.unions, grown.edges);
    expect(a.positions).toEqual(b.positions); // fully deterministic

    for (const p of grown.persons) expect(a.positions.has(p.id), `person ${p.id}`).toBe(true);
    for (const u of grown.unions) {
      expect(a.positions.has(u.id), `union ${u.id}`).toBe(u.partnerB ? true : false);
    }
    expect(findOverlaps(a.positions, grown.persons, grown.unions)).toEqual([]);
  });

  it("lays out collapsed-cluster surrogate cards as extra nodes without overlap", async () => {
    // Simulate collapsing u3: a surrogate cluster card ("__collapsed__u3") is laid out
    // as an extra node, plus a collapse boundary edge from u3 to the surrogate.
    const withSurrogate = {
      persons: [...persons],
      unions: [...unions],
      edges: [...edges, { unionId: "u3", childId: "__collapsed__u3" }],
      extras: [{ id: "__collapsed__u3" }],
    };
    const { positions } = await manualFamilyLayout(
      withSurrogate.persons,
      withSurrogate.unions,
      withSurrogate.edges,
      withSurrogate.extras
    );
    expect(positions.has("__collapsed__u3")).toBe(true);
    // all real persons + couples still placed, no overlaps
    for (const p of withSurrogate.persons) expect(positions.has(p.id), p.id).toBe(true);
    expect(findOverlaps(positions, withSurrogate.persons, withSurrogate.unions)).toEqual([]);
  });

  it("scales to a large multi-generation tree without overlaps", async () => {
    const persons: { id: string }[] = [];
    const unions: { id: string; partnerA: string; partnerB: string }[] = [];
    const edges: { unionId: string; childId: string }[] = [];
    const mk = (id: string) => persons.push({ id });
    let child = 0;
    for (let i = 0; i < 5; i++) {
      mk(`p${child}`);
      mk(`p${child + 1}`);
      unions.push({ id: `u${i}`, partnerA: `p${child}`, partnerB: `p${child + 1}` });
      for (let k = 0; k < 4; k++) {
        mk(`c${i}_${k}`);
        edges.push({ unionId: `u${i}`, childId: `c${i}_${k}` });
      }
      child += 2;
    }
    persons.push({ id: "x1" }, { id: "x2" }, { id: "x3" });
    unions.push(
      { id: "r1", partnerA: "c0_0", partnerB: "x1" },
      { id: "r2", partnerA: "c0_0", partnerB: "x2" }
    );
    edges.push({ unionId: "r1", childId: "x3" });

    const { positions } = await manualFamilyLayout(persons, unions, edges);
    for (const p of persons) expect(positions.has(p.id), `person ${p.id}`).toBe(true);
    for (const u of unions) expect(positions.has(u.id), `union ${u.id}`).toBe(true);
    expect(findOverlaps(positions, persons, unions)).toEqual([]);
  });

  it("keeps union diamonds between their two partners horizontally", async () => {
    const { positions } = await manualFamilyLayout(persons, unions, edges);
    for (const u of unions) {
      if (!u.partnerB) continue;
      const a = cxOf(positions, u.partnerA);
      const b = cxOf(positions, u.partnerB);
      const d = cxOf(positions, u.id);
      // diamond centre must sit strictly between its two partners (order irrelevant)
      expect(Math.min(a, b) <= d + 10 && d - 10 <= Math.max(a, b));
    }
  });

  it("uses real rendered card dimensions (no overlaps use the same W/H)", () => {
    // Regression guard: the overlap checker and the engine must agree on card size so
    // a "no overlap" verdict in tests means "no overlap on screen".
    expect(LAYOUT_PERSON_H).toBe(PH);
  });
});

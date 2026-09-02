import { describe, it, expect } from "vitest";
import { manualFamilyLayout } from "../familyLayout";

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
const PH = 160;
const UH = 150;

function layoutChecks() {
  const { positions } = manualFamilyLayout(persons, unions, edges);
  const cx = (id: string) => {
    const p = positions.get(id);
    if (!p) return NaN;
    const w = persons.some((x) => x.id === id) ? PW : 110;
    return p.x + w / 2;
  };
  const cy = (id: string) => {
    const p = positions.get(id);
    if (!p) return NaN;
    const h = persons.some((x) => x.id === id) ? PH : UH;
    return p.y + h / 2;
  };
  return { positions, cx, cy };
}

describe("manualFamilyLayout (live tree)", () => {
  it("places every person and union", () => {
    const { positions } = manualFamilyLayout(persons, unions, edges);
    for (const p of persons) expect(positions.has(p.id), p.id).toBe(true);
    for (const u of unions) expect(positions.has(u.id), u.id).toBe(true);
  });

  it("centres the diamond between its two partners for standard couples", () => {
    const { cx } = layoutChecks();
    for (const u of unions) {
      if (u.id === "u1" || u.id === "u2") continue; // remarriage-linked, allowed offset
      const mid = (cx(u.partnerA) + cx(u.partnerB)) / 2;
      expect(Math.abs(cx(u.id) - mid)).toBeLessThan(3);
    }
    // remarriage diamonds must still sit between their partners
    for (const u of ["u1", "u2"] as const) {
      const uu = unions.find((x) => x.id === u)!;
      const a = cx(uu.partnerA), b = cx(uu.partnerB), d = cx(uu.id);
      expect(Math.min(a, b) < d && d < Math.max(a, b)).toBe(true);
    }
  });

  it("drops single-child edges straight down", () => {
    const { cx } = layoutChecks();
    // u1->p6, u2->p8, u4->p11 are all single-child unions
    for (const u of ["u1", "u2", "u4"] as const) {
      const child = edges.find((e) => e.unionId === u)!.childId;
      const dx = cx(child) - cx(u);
      expect(Math.abs(dx), `${u}->${child}`).toBeLessThan(4);
    }
  });

  it("fans multiple children symmetrically", () => {
    const { cx } = layoutChecks();
    const p9x = cx("p9") - cx("u3");
    const p10x = cx("p10") - cx("u3");
    // p9 / p10 straddle the diamond symmetrically
    expect(Math.abs(p9x)).toBeGreaterThan(40);
    expect(Math.abs(p10x)).toBeGreaterThan(40);
    expect(Math.abs(Math.abs(p9x) - Math.abs(p10x))).toBeLessThan(6);
  });

  it("produces no overlapping person boxes within a generation row", () => {
    const { positions } = manualFamilyLayout(persons, unions, edges);
    const rows: Record<number, { id: string; l: number; r: number }[]> = {};
    for (const p of persons) {
      const pos = positions.get(p.id)!;
      const y = pos.y;
      const row = Math.round(y / 410);
      (rows[row] = rows[row] || []).push({ id: p.id, l: pos.x, r: pos.x + PW });
    }
    for (const row of Object.values(rows)) {
      row.sort((a, b) => a.l - b.l);
      for (let i = 0; i < row.length - 1; i++) {
        const gap = row[i + 1].l - row[i].r;
        expect(gap, `${row[i].id} vs ${row[i + 1].id}`).toBeGreaterThanOrEqual(-1);
      }
    }
  });

  it("places an only-child directly under its union AND one generation below", () => {
    const { positions, cx } = layoutChecks();
    const p8top = positions.get("p8")!.y;
    const u2top = positions.get("u2")!.y;
    // p8 sits below the union's bottom edge, a full generation row down
    expect(p8top - (u2top + UH)).toBeGreaterThan(40);
    expect(Math.abs(cx("p8") - cx("u2"))).toBeLessThan(4);
  });

  it("handles empty trees and single-parent unions without crashing", () => {
    const empty = manualFamilyLayout([], [], []);
    expect(empty.positions.size).toBe(0);
    const single = manualFamilyLayout(
      [{ id: "p1" }, { id: "p2" }],
      [{ id: "u1", partnerA: "p1", partnerB: "" }],
      [{ unionId: "u1", childId: "p2" }]
    );
    expect(single.positions.has("p1")).toBe(true);
    expect(single.positions.has("p2")).toBe(true);
    expect(single.positions.has("u1")).toBe(false); // single-parent unions are not diamond nodes
  });

  it("stays overlap-free and deterministic when people are added later", () => {
    // Simulate future edits on the live tree:
    //  - p8 remarries (new partner + a child)
    //  - u3 gains two extra children
    //  - a brand-new root family (3 generations) is added
    //  - a single-parent household is added
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

    const a = manualFamilyLayout(grown.persons, grown.unions, grown.edges);
    const b = manualFamilyLayout(grown.persons, grown.unions, grown.edges);
    expect(a.positions).toEqual(b.positions); // fully deterministic

    // every node placed
    for (const p of grown.persons) expect(a.positions.has(p.id), `person ${p.id}`).toBe(true);
    for (const u of grown.unions) {
      if (u.partnerB) expect(a.positions.has(u.id), `union ${u.id}`).toBe(true);
      else expect(a.positions.has(u.id), `single-parent union ${u.id} has no node`).toBe(false);
    }

    // no overlapping person boxes within a generation row (rows are 410px apart,
    // so a same-rounded-row index implies true colliders)
    const rows: Record<number, { id: string; l: number; r: number }[]> = {};
    for (const p of grown.persons) {
      const pos = a.positions.get(p.id)!;
      const row = Math.round(pos.y / 410);
      (rows[row] = rows[row] || []).push({ id: p.id, l: pos.x, r: pos.x + PW });
    }
    for (const row of Object.values(rows)) {
      row.sort((x, y) => x.l - y.l);
      for (let i = 0; i < row.length - 1; i++) {
        const gap = row[i + 1].l - row[i].r;
        expect(gap, `row ${Math.round(row[0].l)} gap ${row[i].id}->${row[i + 1].id}`).toBeGreaterThanOrEqual(-1);
      }
    }

    // new single child u6->n2 still drops straight
    const cxu = (id: string) => a.positions.get(id)!.x + (grown.persons.some((p) => p.id === id) ? PW / 2 : 55);
    expect(Math.abs(cxu("n2") - cxu("u6"))).toBeLessThan(4);
  });

  it("scales to a large multi-generation tree without overlaps", () => {
    // Synthetic family grown 5 generations deep with a re-marriage at the root.
    const persons: { id: string }[] = [];
    const unions: { id: string; partnerA: string; partnerB: string }[] = [];
    const edges: { unionId: string; childId: string }[] = [];
    const mk = (id: string) => persons.push({ id });
    let child = 0;
    for (let i = 0; i < 5; i++) {
      mk(`p${child}`); // partner A
      mk(`p${child + 1}`); // partner B
      unions.push({ id: `u${i}`, partnerA: `p${child}`, partnerB: `p${child + 1}` });
      for (let k = 0; k < 4; k++) {
        mk(`c${i}_${k}`);
        edges.push({ unionId: `u${i}`, childId: `c${i}_${k}` });
      }
      child += 2;
    }
    // make the root's first child a re-married person (two unions, three generations)
    persons.push({ id: "x1" }, { id: "x2" }, { id: "x3" });
    unions.push(
      { id: "r1", partnerA: "c0_0", partnerB: "x1" },
      { id: "r2", partnerA: "c0_0", partnerB: "x2" }
    );
    edges.push({ unionId: "r1", childId: "x3" });

    const { positions } = manualFamilyLayout(persons, unions, edges);
    for (const p of persons) {
      expect(positions.has(p.id), `person ${p.id}`).toBe(true);
    }
    for (const u of unions) expect(positions.has(u.id), `union ${u.id}`).toBe(true);

    const rows: Record<number, { id: string; l: number; r: number }[]> = {};
    for (const p of persons) {
      const pos = positions.get(p.id)!;
      const row = Math.round(pos.y / 410);
      (rows[row] = rows[row] || []).push({ id: p.id, l: pos.x, r: pos.x + PW });
    }
    for (const row of Object.values(rows)) {
      row.sort((a, b) => a.l - b.l);
      for (let i = 0; i < row.length - 1; i++) {
        const gap = row[i + 1].l - row[i].r;
        expect(gap, `${row[i].id} vs ${row[i + 1].id}`).toBeGreaterThanOrEqual(-1);
      }
    }
  });

  it("places descendants above an in-married spouse's union (ancestor-first)", () => {
    // Haque family: Subash(p6) x Jhorna(p5) are the grandparents; their child
    // Shahidul(p3) marries Ambia(p2); their children are Yaleed(p1) and Waleed(p4).
    // The in-married spouse Ambia has no parent edge, but her union u3 must NOT be
    // dragged up to the root row beside the grandparents — it belongs at Shahidul's
    // generation so the tree reads top-down: grandparents -> parents -> children.
    const fam = {
      persons: [
        { id: "p1", name: "Yaleed" },
        { id: "p2", name: "Ambia" },
        { id: "p3", name: "Shahidul" },
        { id: "p4", name: "Waleed" },
        { id: "p5", name: "Jhorna" },
        { id: "p6", name: "Subash" },
      ],
      unions: [
        { id: "u3", partnerA: "p3", partnerB: "p2" },
        { id: "u6", partnerA: "p6", partnerB: "p5" },
      ],
      edges: [
        { unionId: "u3", childId: "p1" },
        { unionId: "u3", childId: "p4" },
        { unionId: "u6", childId: "p3" },
      ],
    };
    const { positions } = manualFamilyLayout(fam.persons, fam.unions, fam.edges);
    const row = (id: string) => Math.round((positions.get(id)!.y + PH / 2) / 410);
    const cx = (id: string) => positions.get(id)!.x + PW / 2;
    // grandparents (Subash, Jhorna) on the top row
    expect(row("p6")).toBe(0);
    expect(row("p5")).toBe(0);
    // parents (Shahidul, Ambia) one generation down
    expect(row("p3")).toBe(1);
    expect(row("p2")).toBe(1);
    // children (Yaleed, Waleed) two generations down
    expect(row("p1")).toBe(2);
    expect(row("p4")).toBe(2);
    // union diamonds on their couple's rows
    expect(Math.round((positions.get("u6")!.y + 75) / 410)).toBe(0);
    expect(Math.round((positions.get("u3")!.y + 75) / 410)).toBe(1);
    // grandparents are horizontally centred as a couple (diamond between them)
    const gMid = (cx("p6") + cx("p5")) / 2;
    expect(Math.abs(positions.get("u6")!.x + 55 - gMid)).toBeLessThan(3);
  });

  it("keeps an in-married spouse from overlapping her bio siblings in the natal fan", () => {
    // Ambia(p2) is BOTH a child of union u9 (Amir x Alea) AND the in-married spouse
    // in union u3 (Shahidul x Ambia). u3 is laid out through Shahidul's lineage, so
    // Ambia renders at that location; her natal fan (u9) must NOT reserve her separate
    // subtree width again — that pushed sibling Alomgir(p10) onto her. Regression for
    // the live Ambia x Alomgir overlap.
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
    const { positions } = manualFamilyLayout(fam.persons, fam.unions, fam.edges);
    // all nodes present
    for (const p of fam.persons) expect(positions.has(p.id), `person ${p.id}`).toBe(true);
    for (const u of fam.unions) expect(positions.has(u.id), `union ${u.id}`).toBe(true);
    // Amba renders once, at her marital union's generation
    expect(Math.round((positions.get("p2")!.y + PH / 2) / 410)).toBe(1);
    // no overlapping person boxes within the same generation row
    const rows: Record<number, { id: string; l: number; r: number }[]> = {};
    for (const p of fam.persons) {
      const pos = positions.get(p.id)!;
      const row = Math.round(pos.y / 410);
      (rows[row] = rows[row] || []).push({ id: p.id, l: pos.x, r: pos.x + PW });
    }
    for (const row of Object.values(rows)) {
      row.sort((a, b) => a.l - b.l);
      for (let i = 0; i < row.length - 1; i++) {
        const gap = row[i + 1].l - row[i].r;
        expect(gap, `row ${row.map((x) => x.id).join(",")} gap ${row[i].id}->${row[i + 1].id}`).toBeGreaterThanOrEqual(-1);
      }
    }
  });
});
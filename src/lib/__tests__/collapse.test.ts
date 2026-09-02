import { describe, it, expect } from "vitest";
import {
  visibleSubset,
  countHidden,
  collapsibleUnionIds,
  sampleDescendantNames,
  surrogateIdFor,
} from "../collapse";
import type {
  CollapsePerson,
  CollapseUnion,
  CollapseEdge,
} from "../collapse";

// Real 13-person dataset from the live tree: 5 unions, 5 parent edges.
// p1(AB)+p2(MB)=u1[p4,p6]; p1+p3(RT)=u2[p8]; p4+p5(JB)=u3[p9,p10]; p6+p7(HC)=u4[p11]; p12(GT) lone root.
const persons: CollapsePerson[] = [
  { id: "p1", fullName: "Arthur Blackwood" },
  { id: "p2", fullName: "Martha Blackwood" },
  { id: "p3", fullName: "Rose Turner" },
  { id: "p4", fullName: "Robert Blackwood" },
  { id: "p5", fullName: "Jenny Blackwood" },
  { id: "p6", fullName: "Thomas Blackwood" },
  { id: "p7", fullName: "Helen Carter" },
  { id: "p8", fullName: "Charles Turner" },
  { id: "p9", fullName: "Emily Blackwood" },
  { id: "p10", fullName: "David Blackwood" },
  { id: "p11", fullName: "Sophie Blackwood" },
  { id: "p12", fullName: "Grace Taylor" },
];

const unions: CollapseUnion[] = [
  { id: "u1", partnerA: "p1", partnerB: "p2", partner_a: "p1", partner_b: "p2" } as CollapseUnion,
  { id: "u2", partnerA: "p1", partnerB: "p3", partner_a: "p1", partner_b: "p3" } as CollapseUnion,
  { id: "u3", partnerA: "p4", partnerB: "p5", partner_a: "p4", partner_b: "p5" } as CollapseUnion,
  { id: "u4", partnerA: "p6", partnerB: "p7", partner_a: "p6", partner_b: "p7" } as CollapseUnion,
  { id: "u5", partnerA: "p12" } as CollapseUnion,
];
const edges: CollapseEdge[] = [
  { unionId: "u1", childId: "p4" },
  { unionId: "u1", childId: "p6" },
  { unionId: "u2", childId: "p8" },
  { unionId: "u3", childId: "p9" },
  { unionId: "u3", childId: "p10" },
  { unionId: "u4", childId: "p11" },
];

describe("visibleSubset", () => {
  it("no collapse: all visible", () => {
    const r = visibleSubset(persons, unions, edges, new Set());
    expect(r.persons.length).toBe(12);
    expect(r.unions.length).toBe(5);
    expect(r.edges.length).toBe(6);
    expect(r.collapsedEdges.length).toBe(0);
  });

  it("collapse u1: hides p4,p6 and their descendants; emits surrogate", () => {
    const r = visibleSubset(persons, unions, edges, new Set(["u1"]));
    // visible: p1,p2,p3,p8,p12
    expect(new Set(r.persons)).toEqual(new Set(["p1", "p2", "p3", "p8", "p12"]));
    // visible unions: u1(still visible as a node), u2, u5
    expect(r.unions).toContain("u1");
    expect(r.unions).toContain("u2");
    expect(r.unions).toContain("u5");
    expect(r.unions).not.toContain("u3"); // hidden (kids of p4, never reached)
    expect(r.unions).not.toContain("u4"); // hidden (kids of p6)
    // one boundary edge
    expect(r.collapsedEdges.length).toBe(1);
    expect(r.collapsedEdges[0]).toEqual({ unionId: "u1", childId: surrogateIdFor("u1") });
    // hidden subtree = p4,p5,p6,p7,p9,p10,p11 (7 persons)
    const hidden = r.collapseSubtree.get("u1");
    expect(hidden).toBeDefined();
    expect(hidden!.length).toBe(7);
  });

  it("collapse u3: hides p9,p10; p4/p5 stay visible", () => {
    const r = visibleSubset(persons, unions, edges, new Set(["u3"]));
    expect(r.persons).toContain("p4");
    expect(r.persons).toContain("p5");
    // p9 and p10 are hidden (children of collapsed u3)
    expect(r.persons).not.toContain("p9");
    expect(r.persons).not.toContain("p10");
    // u3 still rendered as the collapse anchor with a surrogate edge
    expect(r.unions).toContain("u3");
    expect(r.collapsedEdges.length).toBe(1);
    expect(r.collapsedEdges[0]).toEqual({ unionId: "u3", childId: surrogateIdFor("u3") });
    const hidden = r.collapseSubtree.get("u3");
    expect(hidden).toBeDefined();
    expect(new Set(hidden!)).toEqual(new Set(["p9", "p10"]));
  });

  it("no collapse: returns full persons even if empty set", () => {
    const r = visibleSubset(persons, unions, edges, new Set());
    expect(r.persons.length).toBe(12);
  });

  it("collapse u1 hides in-married spouses p5/p7 (reached through the subtree)", () => {
    const r = visibleSubset(persons, unions, edges, new Set(["u1"]));
    expect(r.persons).not.toContain("p5"); // Jenny — wife of p4 (child of u1)
    expect(r.persons).not.toContain("p7"); // Helen — wife of p6 (child of u1)
    expect(r.unions).not.toContain("u3"); // Jenny's union not rendered
    expect(r.unions).not.toContain("u4"); // Helen's union not rendered
  });

  it("collapse u1 AND u3: u3 hidden inside u1; u1 badge counts all 7", () => {
    const r = visibleSubset(persons, unions, edges, new Set(["u1", "u3"]));
    // nothing below u1's collapsed boundary is visible
    expect(new Set(r.persons)).toEqual(new Set(["p1", "p2", "p3", "p8", "p12"]));
    expect(r.unions).not.toContain("u3");
    // only u1 produces a surrogate (u3 is inside u1's hidden region)
    expect(r.collapsedEdges.length).toBe(1);
    expect(r.collapsedEdges[0].unionId).toBe("u1");
    expect(countHidden(persons, unions, edges, "u1")).toBe(7);
  });
});

describe("countHidden", () => {
  it("u1 hides 7 (p4,p5,p6,p7,p9,p10,p11)", () => {
    expect(countHidden(persons, unions, edges, "u1")).toBe(7);
  });
  it("u2 hides 1 (p8)", () => {
    expect(countHidden(persons, unions, edges, "u2")).toBe(1);
  });
  it("u3 hides 2 (p9,p10)", () => {
    expect(countHidden(persons, unions, edges, "u3")).toBe(2);
  });
  it("u4 hides 1 (p11)", () => {
    expect(countHidden(persons, unions, edges, "u4")).toBe(1);
  });
  it("u5 (lone root) hides 0", () => {
    expect(countHidden(persons, unions, edges, "u5")).toBe(0);
  });
});

describe("sampleDescendantNames", () => {
  it("u1 returns first 5 of 7", () => {
    const n = sampleDescendantNames(persons, unions, edges, "u1", 5);
    expect(n.length).toBe(5);
    // all ids should be real descendants of u1
    expect(n).toContain("Robert Blackwood");
    expect(n).toContain("Thomas Blackwood");
  });
  it("u2 returns just Charles Turner", () => {
    const n = sampleDescendantNames(persons, unions, edges, "u2");
    expect(n).toEqual(["Charles Turner"]);
  });
  it("u5 returns empty (no kids)", () => {
    expect(sampleDescendantNames(persons, unions, edges, "u5")).toEqual([]);
  });
});

describe("collapsibleUnionIds", () => {
  it("returns union ids that appear in edges", () => {
    const r = collapsibleUnionIds(unions, edges);
    expect(r.has("u1")).toBe(true);
    expect(r.has("u2")).toBe(true);
    expect(r.has("u3")).toBe(true);
    expect(r.has("u4")).toBe(true);
    expect(r.has("u5")).toBe(false); // no children
  });
});

describe("surrogateIdFor", () => {
  it("returns unique id", () => {
    expect(surrogateIdFor("u1")).toBe("__collapsed__u1");
    expect(surrogateIdFor("u2")).not.toBe(surrogateIdFor("u1"));
  });
});

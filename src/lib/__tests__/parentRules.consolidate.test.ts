import { describe, it, expect } from "vitest";
import { consolidateSingleParentBiologicalUnions, type UnionRow, type EdgeRow, type Gender } from "../parentRules";

const genders = new Map<string, Gender>([
  ["mother", "female"],
  ["father", "male"],
  ["m2", "female"],
  ["f2", "male"],
]);

describe("consolidateSingleParentBiologicalUnions", () => {
  it("merges a child's two single-parent bio unions into one couple union", () => {
    const unions: UnionRow[] = [
      { id: "u1", partnerA: "mother", partnerB: "" }, // Ambia-like
      { id: "u2", partnerA: "father", partnerB: "" }, // Shahidul-like
    ];
    const edges: EdgeRow[] = [
      { unionId: "u1", childId: "yaleed", relationshipType: "biological" },
      { unionId: "u2", childId: "yaleed", relationshipType: "biological" },
    ];

    const res = consolidateSingleParentBiologicalUnions(unions, edges, genders);

    // One union survives (u1 < u2 deterministically) and it's now a couple.
    expect(res.unions).toHaveLength(1);
    const merged = res.unions[0];
    expect(merged.id).toBe("u1");
    expect([merged.partnerA, merged.partnerB].sort()).toEqual(["father", "mother"].sort());
    // One child edge pointing at the merged union.
    expect(res.edges).toHaveLength(1);
    expect(res.edges[0].unionId).toBe("u1");
    expect(res.edges[0].childId).toBe("yaleed");
    expect(res.edges[0].relationshipType).toBe("biological");
    expect(res.merged).toHaveLength(1);
    expect(res.merged[0].childId).toBe("yaleed");
    expect(res.merged[0].fromUnionIds.sort()).toEqual(["u1", "u2"]);
  });

  it("leaves an already-couple union alone", () => {
    const unions: UnionRow[] = [{ id: "u3", partnerA: "mother", partnerB: "father" }];
    const edges: EdgeRow[] = [{ unionId: "u3", childId: "yaleed", relationshipType: "biological" }];
    const res = consolidateSingleParentBiologicalUnions(unions, edges, genders);
    expect(res.unions).toHaveLength(1);
    expect(res.unions[0].id).toBe("u3");
    expect(res.edges).toHaveLength(1);
    expect(res.merged).toHaveLength(0);
  });

  it("does not merge step/adopted edges", () => {
    const unions: UnionRow[] = [
      { id: "u1", partnerA: "mother", partnerB: "" },
      { id: "u2", partnerA: "father", partnerB: "" },
    ];
    const edges: EdgeRow[] = [
      { unionId: "u1", childId: "yaleed", relationshipType: "biological" },
      { unionId: "u2", childId: "yaleed", relationshipType: "step" },
    ];
    const res = consolidateSingleParentBiologicalUnions(unions, edges, genders);
    expect(res.merged).toHaveLength(0);
    expect(res.unions).toHaveLength(2);
  });

  it("does not merge when a child is attached to only one single-parent union", () => {
    const unions: UnionRow[] = [{ id: "u1", partnerA: "mother", partnerB: "" }];
    const edges: EdgeRow[] = [{ unionId: "u1", childId: "yaleed", relationshipType: "biological" }];
    const res = consolidateSingleParentBiologicalUnions(unions, edges, genders);
    expect(res.merged).toHaveLength(0);
    expect(res.unions).toHaveLength(1);
  });

  it("does not merge two same-gender single parents (would be a dual-parent conflict)", () => {
    const unions: UnionRow[] = [
      { id: "u1", partnerA: "mother", partnerB: "" },
      { id: "u2", partnerA: "m2", partnerB: "" },
    ];
    const edges: EdgeRow[] = [
      { unionId: "u1", childId: "yaleed", relationshipType: "biological" },
      { unionId: "u2", childId: "yaleed", relationshipType: "biological" },
    ];
    const res = consolidateSingleParentBiologicalUnions(unions, edges, genders);
    expect(res.merged).toHaveLength(0);
    expect(res.unions).toHaveLength(2);
  });

  it("handles unknown genders (empty) by merging", () => {
    const g = new Map<string, Gender>();
    const unions: UnionRow[] = [
      { id: "u1", partnerA: "parentA", partnerB: "" },
      { id: "u2", partnerA: "parentB", partnerB: "" },
    ];
    const edges: EdgeRow[] = [
      { unionId: "u1", childId: "kid", relationshipType: "biological" },
      { unionId: "u2", childId: "kid", relationshipType: "biological" },
    ];
    const res = consolidateSingleParentBiologicalUnions(unions, edges, g);
    expect(res.merged).toHaveLength(1);
    expect(res.unions).toHaveLength(1);
    // parents preserved, partnerB populated
    expect([res.unions[0].partnerA, res.unions[0].partnerB].sort()).toEqual(["parentA", "parentB"].sort());
  });

  it("is idempotent — running twice is stable", () => {
    const unions: UnionRow[] = [
      { id: "u1", partnerA: "mother", partnerB: "" },
      { id: "u2", partnerA: "father", partnerB: "" },
    ];
    const edges: EdgeRow[] = [
      { unionId: "u1", childId: "yaleed", relationshipType: "biological" },
      { unionId: "u2", childId: "yaleed", relationshipType: "biological" },
    ];
    const once = consolidateSingleParentBiologicalUnions(unions, edges, genders);
    const twice = consolidateSingleParentBiologicalUnions(once.unions, once.edges, genders);
    expect(twice.merged).toHaveLength(0);
    expect(twice.unions).toHaveLength(1);
    expect(twice.edges).toHaveLength(1);
  });
});

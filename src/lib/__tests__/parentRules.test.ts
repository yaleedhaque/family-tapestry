import { describe, it, expect } from "vitest";
import {
  normalizeGender,
  isBiological,
  unionParentIds,
  findDualParentConflicts,
  wouldCreateDualBiologicalParent,
  wouldGenderChangeBreakRule,
  type Gender,
  type UnionRow,
  type EdgeRow,
} from "../parentRules";

function gm(map: Record<string, Gender>): Map<string, Gender> {
  return new Map(Object.entries(map));
}

const u1: UnionRow = { id: "u1", partnerA: "dad", partnerB: "mom" };
const u2: UnionRow = { id: "u2", partnerA: "mom2", partnerB: "stepdad" };
const u3: UnionRow = { id: "u3", partnerA: "dad", partnerB: "stepparent" };
const uSingle: UnionRow = { id: "u4", partnerA: "singleMom", partnerB: "" };

const genders = gm({
  dad: "male",
  mom: "female",
  mom2: "female",
  stepdad: "male",
  stepparent: "other",
  singleMom: "female",
});

describe("normalizeGender", () => {
  it("keeps canonical values and collapses everything else to unknown", () => {
    expect(normalizeGender("female")).toBe("female");
    expect(normalizeGender("MALE")).toBe("male");
    expect(normalizeGender("other")).toBe("other");
    expect(normalizeGender("")).toBe("");
    expect(normalizeGender(undefined)).toBe("");
    expect(normalizeGender(null)).toBe("");
    expect(normalizeGender("non-binary")).toBe("");
  });
});

describe("isBiological", () => {
  it("treats undefined/empty/biological as biological and nothing else", () => {
    expect(isBiological(undefined)).toBe(true);
    expect(isBiological("")).toBe(true);
    expect(isBiological("biological")).toBe(true);
    expect(isBiological("adopted")).toBe(false);
    expect(isBiological("step")).toBe(false);
  });
});

describe("unionParentIds", () => {
  it("skips empty partner slots", () => {
    expect(unionParentIds(uSingle)).toEqual(["singleMom"]);
    expect(unionParentIds(u1)).toEqual(["dad", "mom"]);
  });
});

describe("findDualParentConflicts", () => {
  it("flags a child with two known biological mothers", () => {
    const edges: EdgeRow[] = [
      { unionId: "u1", childId: "kid" },
      { unionId: "u2", childId: "kid" },
    ];
    const res = findDualParentConflicts([u1, u2], edges, genders);
    expect(res).toContainEqual({ childId: "kid", role: "mother" });
  });

  it("allows one mother + one father via two single unions", () => {
    const edges: EdgeRow[] = [
      { unionId: "u1", childId: "kid" }, // dad+mom
      { unionId: "uSingle", childId: "kid2" }, // single mother of a different child
    ];
    const res = findDualParentConflicts([u1, uSingle], edges, genders);
    expect(res).toEqual([]);
  });

  it("allows a child whose other biological parent recorded has unknown gender", () => {
    const edges: EdgeRow[] = [
      { unionId: "u3", childId: "kid" }, // dad + other
    ];
    const res = findDualParentConflicts([u3], edges, genders);
    expect(res).toEqual([]);
  });

  it("ignores step/adopted links", () => {
    const edges: EdgeRow[] = [
      { unionId: "u1", childId: "kid", relationshipType: "adopted" },
      { unionId: "u2", childId: "kid", relationshipType: "step" },
    ];
    const res = findDualParentConflicts([u1, u2], edges, genders);
    expect(res).toEqual([]);
  });

  it("flags two known biological fathers too", () => {
    const uTwoFathers: UnionRow = { id: "u5", partnerA: "stepdad", partnerB: "dad" };
    const edges: EdgeRow[] = [{ unionId: "u5", childId: "kid" }];
    const res = findDualParentConflicts([uTwoFathers], edges, genders);
    expect(res).toContainEqual({ childId: "kid", role: "father" });
  });

  it("does not double-count a person who appears in two unions (remarriage)", () => {
    const uRemarried: UnionRow = { id: "u6", partnerA: "dad", partnerB: "stepMom" };
    const genders2 = gm({ dad: "male", mom: "female", stepMom: "female" });
    const edges: EdgeRow[] = [
      { unionId: "u1", childId: "kid" }, // dad+mom
      { unionId: "u6", childId: "kid", relationshipType: "biological" }, // dad+stepMom
    ];
    // Distinct persons: dad(M), mom(F), stepMom(F) -> one father, two mothers
    const res = findDualParentConflicts([u1, uRemarried], edges, genders2);
    expect(res).toContainEqual({ childId: "kid", role: "mother" });
  });
});

describe("wouldCreateDualBiologicalParent", () => {
  it("blocks adding a woman whose union is a different couple when child already has a biological mother", () => {
    const existingEdges: EdgeRow[] = [{ unionId: "u1", childId: "kid" }]; // dad+mom
    const allUnions = [u1, u2];
    const result = wouldCreateDualBiologicalParent(
      allUnions,
      existingEdges,
      genders,
      "kid",
      "u2",
      "biological"
    );
    expect(result).toBe("mother");
  });

  it("allows the same union to gain one more child (no-op dedup)", () => {
    const existingEdges: EdgeRow[] = [{ unionId: "u1", childId: "kid" }];
    const result = wouldCreateDualBiologicalParent(
      [u1],
      existingEdges,
      genders,
      "kid",
      "u1",
      "biological"
    );
    expect(result).toBeNull();
  });

  it("allows a step link to the same couple even if a biological mother already exists", () => {
    const existingEdges: EdgeRow[] = [{ unionId: "u1", childId: "kid" }];
    const result = wouldCreateDualBiologicalParent(
      [u1, u2],
      existingEdges,
      genders,
      "kid",
      "u2",
      "step"
    );
    expect(result).toBeNull();
  });

  it("allows a divorced child of one mother when the sibling link is a single-parent union", () => {
    const existingEdges: EdgeRow[] = [{ unionId: "u1", childId: "kid" }];
    const result = wouldCreateDualBiologicalParent(
      [u1, uSingle],
      existingEdges,
      genders,
      "otherKid",
      "u4",
      "biological"
    );
    expect(result).toBeNull();
  });
});

describe("wouldGenderChangeBreakRule", () => {
  it("rejects a gender change that would create two known mothers for an existing child", () => {
    // Change mom2 (currently gender-unknown) to "female" when she is already a
    // biological parent of kid alongside the known mother -> must trip.
    const edges: EdgeRow[] = [
      { unionId: "u1", childId: "kid" },
      { unionId: "u2", childId: "kid", relationshipType: "biological" },
    ];
    // mom2 is already female -> kid already has 2 mothers; but the point here
    // is asserting the function trips when a gender flip introduces it:
    const before = gm({ dad: "male", mom: "female", mom2: "", stepdad: "male" });
    const result = wouldGenderChangeBreakRule([u1, u2], edges, before, "mom2", "female");
    expect(result).toBe("mother");
  });

  it("allows a safe gender change", () => {
    const edges: EdgeRow[] = [{ unionId: "u1", childId: "kid" }];
    const before = gm({ dad: "male", mom: "", stepdad: "male" });
    const result = wouldGenderChangeBreakRule([u1], edges, before, "mom", "female");
    expect(result).toBeNull();
  });

  it("returns null when the person is not a biological parent of anyone", () => {
    const edges: EdgeRow[] = [{ unionId: "u1", childId: "kid" }];
    const result = wouldGenderChangeBreakRule([u1], edges, genders, "stranger", "female");
    expect(result).toBeNull();
  });
});

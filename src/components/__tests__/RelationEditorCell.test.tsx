import { describe, it, expect } from "vitest";
import {
  nextUnionId,
  findParentUnion,
  commitAddParent,
  commitAddChild,
  commitAddPartner,
  commitRemoveParent,
  commitRemovePartner,
  commitEditEdgeRel,
  commitEditUnion,
} from "@/components/RelationEditorCell";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";

const persons: PersonLike[] = [
  { id: "p1", fullName: "Shahidul", gender: "male" },
  { id: "p2", fullName: "Ambia", gender: "female" },
  { id: "p3", fullName: "Yaleed", gender: "male" },
  { id: "p4", fullName: "Subash", gender: "male" },
  { id: "p5", fullName: "Jhorna", gender: "female" },
  { id: "p6", fullName: "Sagor", gender: "male" },
].map((p) => ({
  ...p,
  nameNative: null,
  birthYear: null,
  deathYear: null,
  isAlive: true,
  bio: "",
  birthPlace: "",
  profession: "",
  email: "",
  phone: "",
  address: "",
  website: "",
  lat: null,
  lng: null,
  photoUrl: "",
}));

const baseUnions: UnionLike[] = [
  { id: "u1", partnerA: "p1", partnerB: "p2", type: "marriage", startYear: 1980, endYear: null },
];
const baseEdges: EdgeLike[] = [{ unionId: "u1", childId: "p3", relationshipType: "biological" }];

describe("RelationEditorCell pure helpers", () => {
  it("nextUnionId parses numeric suffix", () => {
    expect(nextUnionId(baseUnions)).toBe("u2");
    expect(nextUnionId([...baseUnions, { id: "u9", partnerA: "p4", partnerB: "", type: "marriage", startYear: null, endYear: null }])).toBe("u10");
  });

  it("findParentUnion prefers couple union", () => {
    const unions: UnionLike[] = [
      { id: "u1", partnerA: "p1", partnerB: "p2", type: "marriage", startYear: null, endYear: null },
      { id: "u2", partnerA: "p1", partnerB: "", type: "marriage", startYear: null, endYear: null },
    ];
    const singles = findParentUnion([unions[1]], "p1");
    expect(singles?.id).toBe("u2");
    expect(findParentUnion(unions, "p1")?.id).toBe("u1");
  });

  it("commitAddParent reuses child's existing single union and merges the second bio parent", () => {
    const unions: UnionLike[] = [
      { id: "u1", partnerA: "p1", partnerB: "", type: "marriage", startYear: null, endYear: null },
    ];
    const edges: EdgeLike[] = [{ unionId: "u1", childId: "p3", relationshipType: "biological" }];
    const res = commitAddParent(unions, edges, persons, "p3", "p2", "biological");
    expect(res).not.toBeNull();
    expect(res!.unions[0].partnerB).toBe("p2");
    expect(res!.unions).toHaveLength(1);
  });

  it("commitAddParent guards dual-bio-mother", () => {
    // p3 already has bio parents p1 (male) + p2 (female); adding p5 (female) as bio must be rejected
    const unions: UnionLike[] = [
      { id: "u1", partnerA: "p1", partnerB: "p2", type: "marriage", startYear: null, endYear: null },
    ];
    const edges: EdgeLike[] = [{ unionId: "u1", childId: "p3", relationshipType: "biological" }];
    expect(commitAddParent(unions, edges, persons, "p3", "p5", "biological")).toBeNull();
    // step is allowed
    expect(commitAddParent(unions, edges, persons, "p3", "p5", "step")).not.toBeNull();
  });

  it("commitAddChild attaches to parent's existing union", () => {
    const res = commitAddChild(baseUnions, baseEdges, "p1", "p4", "biological");
    expect(res.unions).toHaveLength(1);
    expect(res.edges).toEqual([
      ...baseEdges,
      { unionId: "u1", childId: "p4", relationshipType: "biological" },
    ]);
  });

  it("commitAddChild creates a single-parent union when parent has none", () => {
    const res = commitAddChild([], [], "p6", "p5", "adopted");
    const u = res.unions[0];
    expect(u.partnerA).toBe("p6");
    expect(u.partnerB).toBe("");
    expect(res.edges).toEqual([
      { unionId: u.id, childId: "p5", relationshipType: "adopted" },
    ]);
  });

  it("commitAddPartner creates a couple union", () => {
    const res = commitAddPartner(baseUnions, baseEdges, "p4", "p5", "marriage", 1990);
    const u = res.unions[res.unions.length - 1];
    expect(u.partnerA).toBe("p4");
    expect(u.partnerB).toBe("p5");
    expect(u.startYear).toBe(1990);
    expect(res.edges).toEqual(baseEdges);
  });

  it("commitRemoveParent reparents the child onto the other parent's single union", () => {
    const res = commitRemoveParent(baseUnions, baseEdges, "p3", "p2");
    expect(res.unions).toHaveLength(2);
    const newSingle = res.unions.find((u) => u.id !== "u1");
    expect(newSingle?.partnerA).toBe("p1");
    expect(newSingle?.partnerB).toBe("");
    expect(res.edges).toEqual([
      { unionId: newSingle!.id, childId: "p3", relationshipType: "biological" },
    ]);
  });

  it("commitRemoveParent detaches when no other parent", () => {
    const unions: UnionLike[] = [
      { id: "u1", partnerA: "p1", partnerB: "", type: "marriage", startYear: null, endYear: null },
    ];
    const res = commitRemoveParent(unions, baseEdges, "p3", "p1");
    expect(res.unions).toHaveLength(1);
    expect(res.edges).toHaveLength(0);
  });

  it("commitRemovePartner removes the union and its child edges", () => {
    const res = commitRemovePartner(baseUnions, baseEdges, "u1");
    expect(res.unions).toHaveLength(0);
    expect(res.edges).toHaveLength(0);
  });

  it("commitEditEdgeRel updates relationship type", () => {
    const res = commitEditEdgeRel(baseEdges, "u1", "p3", "adopted");
    expect(res[0].relationshipType).toBe("adopted");
    // invalid rels coerce to biological
    expect(commitEditEdgeRel(baseEdges, "u1", "p3", "garbage")[0].relationshipType).toBe("biological");
  });

  it("commitEditUnion patches type and years", () => {
    const res = commitEditUnion(baseUnions, "u1", { type: "divorced", startYear: 1985, endYear: 2000 });
    expect(res[0].type).toBe("divorced");
    expect(res[0].startYear).toBe(1985);
    expect(res[0].endYear).toBe(2000);
  });
});
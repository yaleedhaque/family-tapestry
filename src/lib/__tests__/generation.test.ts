import { describe, it, expect } from "vitest";
import { computeGenerationMap } from "../generation";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";

function person(id: string): PersonLike {
  return {
    id,
    fullName: id,
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
  };
}

function union(id: string, partnerA: string, partnerB: string, type = "marriage"): UnionLike {
  return { id, partnerA, partnerB, type, startYear: null, endYear: null };
}

function edge(unionId: string, childId: string): EdgeLike {
  return { unionId, childId, relationshipType: "biological" };
}

describe("computeGenerationMap (spouse-aware)", () => {
  it("keeps a spouses without lineage sharing the lineage-bearer's generation", () => {
    // Grandparent couple (no parents in tree) → children → grandchild.
    // dad/mom are roots (gen 0). Their child son is gen 1. son marries wife
    // (in-married, no lineage) → wife must align to gen 1, not stay at 0.
    const persons = [
      person("dad"), person("mom"), person("son"), person("wife"), person("grandkid"),
    ];
    const unions = [
      union("u1", "dad", "mom"),        // son's parents  (roots)
      union("u2", "son", "wife"),       // son + in-married wife
    ];
    const edges = [
      edge("u1", "son"),                // dad+mom -> son
      edge("u2", "grandkid"),           // son+wife -> grandkid
    ];
    const g = computeGenerationMap(persons, unions, edges);
    expect(g["dad"]).toBe(0);
    expect(g["mom"]).toBe(0);
    expect(g["son"]).toBe(1);
    // Wife married in with no parent edge → now aligned to her partner (gen 1),
    // so the marriage line to the union diamond is flat instead of diagonal.
    expect(g["wife"]).toBe(1);
    expect(g["grandkid"]).toBe(2);
  });

  it("aligns both partners when they differ but never lowers a lineage-bearer", () => {
    // p1 (root) x p2 (root). p1 remarrying another root — stays 0.
    const persons = [person("p1"), person("p2"), person("p3"), person("kid")];
    const unions = [
      union("u1", "p2", "p1"),
      union("u2", "p1", "p3"),
    ];
    const edges = [edge("u1", "kid")];
    const g = computeGenerationMap(persons, unions, edges);
    expect(g["p1"]).toBe(0);
    expect(g["p2"]).toBe(0);
    expect(g["p3"]).toBe(0);
    expect(g["kid"]).toBe(1);
  });
});

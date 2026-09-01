import { describe, it, expect } from "vitest";
import {
  computeCircle,
  canEditField,
  can,
  isTrustedEdge,
  isSelf,
  isSelfOrCircle,
  type CircleData,
  type UnionRow,
  type ParentEdgeRow,
} from "../permissions";

// Identity constants
const USER = "u-user"; // the logged-in "user" role account
const EDITOR = "u-editor";
const ADMIN = "u-admin";
const STRANGER = "u-stranger"; // another user whose edges must NOT grant access

// Person ids
const pSelf = "p-self";
const pPartner = "p-partner";
const pDad = "p-dad";
const pMom = "p-mom";
const pChild = "p-child";
const pSib = "p-sibling";
const pGramps = "p-grandparent";
const pFake = "p-fake-injected";

const okCreators = new Set([USER, EDITOR, ADMIN]);

function circle(
  unions: UnionRow[],
  parentEdges: ParentEdgeRow[],
  selfPersonIds: string[] = [pSelf]
): CircleData {
  return computeCircle({ selfPersonIds, unions, parentEdges, okCreators });
}

describe("isTrustedEdge (rule 5.1)", () => {
  it("trusts self-created edges", () => {
    expect(isTrustedEdge(USER, okCreators)).toBe(true);
  });
  it("trusts editor/admin-created edges", () => {
    expect(isTrustedEdge(EDITOR, okCreators)).toBe(true);
    expect(isTrustedEdge(ADMIN, okCreators)).toBe(true);
  });
  it("rejects edges from an arbitrary user", () => {
    expect(isTrustedEdge(STRANGER, okCreators)).toBe(false);
  });
  it("rejects null/empty creators (unverifiable legacy)", () => {
    expect(isTrustedEdge(null, okCreators)).toBe(false);
  });
});

describe("computeCircle — self", () => {
  it("includes the user's own person(s)", () => {
    const c = circle([], []);
    expect(isSelf(c, pSelf)).toBe(true);
    expect(isSelfOrCircle(c, pSelf)).toBe(true);
  });
});

describe("computeCircle — partner (direct edge)", () => {
  const unions: UnionRow[] = [
    { id: "u-partner", partnerA: pSelf, partnerB: pPartner, createdBy: USER },
  ];
  it("adds a direct trusted partner", () => {
    const c = circle(unions, []);
    expect(isSelfOrCircle(c, pPartner)).toBe(true);
  });
  it("does NOT add a partner linked by a stranger-created edge", () => {
    const bad: UnionRow[] = [
      { id: "u-partner-bad", partnerA: pSelf, partnerB: pFake, createdBy: STRANGER },
    ];
    const c = circle(bad, []);
    expect(isSelfOrCircle(c, pFake)).toBe(false);
  });
});

describe("computeCircle — parents", () => {
  const unions: UnionRow[] = [
    { id: "u-parents", partnerA: pDad, partnerB: pMom, createdBy: EDITOR },
  ];
  const edges: ParentEdgeRow[] = [
    { unionId: "u-parents", childId: pSelf, createdBy: EDITOR },
  ];
  it("adds direct parents via a trusted union+edge", () => {
    const c = circle(unions, edges);
    expect(isSelfOrCircle(c, pDad)).toBe(true);
    expect(isSelfOrCircle(c, pMom)).toBe(true);
  });
  it("does NOT grant parents via a stranger-created edge", () => {
    const badEdges: ParentEdgeRow[] = [
      { unionId: "u-parents", childId: pSelf, createdBy: STRANGER },
    ];
    const c = circle(unions, badEdges);
    expect(isSelfOrCircle(c, pDad)).toBe(false);
  });
});

describe("computeCircle — one hop only (no siblings/grandparents)", () => {
  const unions: UnionRow[] = [
    { id: "u-parents", partnerA: pDad, partnerB: pMom, createdBy: EDITOR },
    { id: "u-gramps", partnerA: pGramps, partnerB: pDad, createdBy: EDITOR },
  ];
  const edges: ParentEdgeRow[] = [
    { unionId: "u-parents", childId: pSelf, createdBy: EDITOR },
    { unionId: "u-parents", childId: pSib, createdBy: EDITOR },
    { unionId: "u-gramps", childId: pDad, createdBy: EDITOR },
  ];
  const c = circle(unions, edges);
  it("excludes siblings", () => {
    expect(isSelfOrCircle(c, pSib)).toBe(false);
  });
  it("excludes grandparents (no hop-2)", () => {
    expect(isSelfOrCircle(c, pGramps)).toBe(false);
  });
});

describe("computeCircle — children", () => {
  const unions: UnionRow[] = [
    { id: "u-partner", partnerA: pSelf, partnerB: pPartner, createdBy: USER },
  ];
  const edges: ParentEdgeRow[] = [
    { unionId: "u-partner", childId: pChild, createdBy: USER },
  ];
  it("adds direct children via a trusted union", () => {
    const c = circle(unions, edges);
    expect(isSelfOrCircle(c, pChild)).toBe(true);
  });
});

describe("canEditField (rule 5.2 + matrix)", () => {
  const unions: UnionRow[] = [
    { id: "u-partner", partnerA: pSelf, partnerB: pPartner, createdBy: USER },
    { id: "u-parents", partnerA: pDad, partnerB: pMom, createdBy: EDITOR },
  ];
  const edges: ParentEdgeRow[] = [
    { unionId: "u-parents", childId: pSelf, createdBy: EDITOR },
    { unionId: "u-partner", childId: pChild, createdBy: USER },
  ];
  const c = circle(unions, edges);

  it("user may edit own private + genealogical fields", () => {
    expect(canEditField("user", c, pSelf, "bio")).toBe(true);
    expect(canEditField("user", c, pSelf, "email")).toBe(true);
    expect(canEditField("user", c, pSelf, "full_name")).toBe(true);
  });

  it("user may edit genealogical fields on parents/children", () => {
    expect(canEditField("user", c, pDad, "full_name")).toBe(true);
    expect(canEditField("user", c, pDad, "birth_year")).toBe(true);
    expect(canEditField("user", c, pChild, "profession")).toBe(true);
  });

  it("user may NOT edit private fields on parents/children", () => {
    expect(canEditField("user", c, pDad, "bio")).toBe(false);
    expect(canEditField("user", c, pDad, "email")).toBe(false);
    expect(canEditField("user", c, pChild, "phone")).toBe(false);
    expect(canEditField("user", c, pDad, "photo_url")).toBe(false);
  });

  it("editor/admin may edit anything", () => {
    expect(canEditField("editor", c, pSib, "bio")).toBe(true);
    expect(canEditField("admin", c, pSib, "email")).toBe(true);
  });

  it("viewer may edit nothing", () => {
    expect(canEditField("viewer", c, pSelf, "full_name")).toBe(false);
    expect(canEditField("viewer", c, pSelf, "bio")).toBe(false);
  });
});

describe("can() — coarse permission matrix", () => {
  it("edit-any requires editor/admin", () => {
    expect(can("viewer", "edit-any")).toBe(false);
    expect(can("user", "edit-any")).toBe(false);
    expect(can("editor", "edit-any")).toBe(true);
    expect(can("admin", "edit-any")).toBe(true);
  });
  it("create-person allows user+", () => {
    expect(can("viewer", "create-person")).toBe(false);
    expect(can("user", "create-person")).toBe(true);
    expect(can("editor", "create-person")).toBe(true);
  });
  it("manage-users is admin only", () => {
    expect(can("editor", "manage-users")).toBe(false);
    expect(can("admin", "manage-users")).toBe(true);
  });
  it("edit-own-profile allows user+", () => {
    expect(can("viewer", "edit-own-profile")).toBe(false);
    expect(can("user", "edit-own-profile")).toBe(true);
  });
});

// Pure, DB-agnostic 4-tier permission logic (admin > editor > user > viewer).
// No imports from Supabase so this stays unit-testable in node.

export type Role = "admin" | "editor" | "user" | "viewer";

// A person's private/profile fields — editable only by the person themself,
// an editor, or an admin (rule 5.2). A "user" may never touch these on a
// parent/partner/child.
export const PRIVATE_FIELDS = ["bio", "photo_url", "email", "phone", "address", "website"] as const;

// Genealogical fields a "user" may edit on circle members (parents/children).
export const GENEALOGICAL_FIELDS = [
  "full_name",
  "birth_year",
  "death_year",
  "is_alive",
  "birth_place",
  "death_place",
  "profession",
  "lat",
  "lng",
] as const;

// Relationship/party shapes (snake_case mirrors the DB rows).
export interface UnionRow {
  id: string;
  partnerA: string;
  partnerB: string;
  createdBy: string | null;
}

export interface ParentEdgeRow {
  unionId: string;
  childId: string;
  createdBy: string | null;
}

export interface CircleData {
  /** Persons that ARE the logged-in user (person.created_by === userId). */
  selfPersonIds: Set<string>;
  /** Self + validated direct parents/partners/children (rule 4, one hop). */
  circlePersonIds: Set<string>;
}

export interface CircleInput {
  selfPersonIds: string[];
  unions: UnionRow[];
  parentEdges: ParentEdgeRow[];
  /** created_by values that may grant circle access: user themself + approved editor/admin. */
  okCreators: Set<string>;
}

/**
 * Rule 5.1 edge guard: an edge only "counts" toward a user's circle if it was
 * created by the user themself or by an approved editor/admin.
 */
export function isTrustedEdge(createdBy: string | null, okCreators: Set<string>): boolean {
  return !!createdBy && okCreators.has(createdBy);
}

/**
 * Compute a user's editable circle from the relationship graph (rule 4 + 5.1).
 * Exactly one hop — never transitive.
 */
export function computeCircle(input: CircleInput): CircleData {
  const self = new Set<string>(input.selfPersonIds);
  const circle = new Set<string>(self);

  // Trusted unions: those whose edge creator is acceptable.
  const trustedUnions = input.unions.filter((u) => isTrustedEdge(u.createdBy, input.okCreators));

  // Trusted child edges grouped by union id (parents -> children).
  const childrenByUnion = new Map<string, string[]>();
  for (const pe of input.parentEdges) {
    if (!isTrustedEdge(pe.createdBy, input.okCreators)) continue;
    const arr = childrenByUnion.get(pe.unionId) ?? [];
    arr.push(pe.childId);
    childrenByUnion.set(pe.unionId, arr);
  }

  const addNonEmpty = (pid: string) => {
    if (pid && pid.trim() !== "") circle.add(pid);
  };

  for (const u of trustedUnions) {
    const a = u.partnerA ?? "";
    const b = u.partnerB ?? "";
    const aIsSelf = self.has(a);
    const bIsSelf = self.has(b);
    const kids = childrenByUnion.get(u.id) ?? [];

    if (aIsSelf || bIsSelf) {
      // The other partner is the user's partner (or, if partner_b is empty
      // because the union only records one side, skip the bogus empty id).
      if (aIsSelf && b) addNonEmpty(b);
      if (bIsSelf && a) addNonEmpty(a);
      // Their children are the user's children too.
      for (const cid of kids) addNonEmpty(cid);
    }

    // If one of this union's children is the user themselves, the partners
    // are the user's parents (and the union forms the parents' relationship).
    if (kids.some((k) => self.has(k))) {
      addNonEmpty(a);
      addNonEmpty(b);
    }
  }

  return { selfPersonIds: self, circlePersonIds: circle };
}

export function isSelf(circle: CircleData, personId: string): boolean {
  return circle.selfPersonIds.has(personId);
}

export function isSelfOrCircle(circle: CircleData, personId: string): boolean {
  return circle.circlePersonIds.has(personId);
}

/** Which PATCH fields may a user change on person `pid` (rule 5.2 + matrix). */
export function canEditField(role: Role, circle: CircleData, pid: string, fieldKey: string): boolean {
  if (role === "admin" || role === "editor") return true;
  if (role !== "user") return false; // viewer: no edits anywhere
  // User editing themselves: full control of their own profile.
  if (isSelf(circle, pid)) return true;
  // User editing a parent/partner/child: only genealogical fields.
  return (PRIVATE_FIELDS as readonly string[]).includes(fieldKey) === false;
}

/**
 * Coarse permission-matrix check for role-gated actions that do not depend on
 * the relationship graph (matches the spec §8 matrix).
 */
export type PermissionAction =
  | "edit-any" // edit/delete any person or relationship (+ GEDCOM import/export)
  | "create-person" // add a new person record
  | "manage-users" // assign roles / approve / revoke members (admin only)
  | "edit-own-profile"; // edit own profile (user+)

export function can(role: Role, action: PermissionAction): boolean {
  switch (action) {
    case "edit-any":
      return role === "editor" || role === "admin";
    case "create-person":
      return role === "user" || role === "editor" || role === "admin";
    case "manage-users":
      return role === "admin";
    case "edit-own-profile":
      return role === "user" || role === "editor" || role === "admin";
    default:
      return false;
  }
}

export const ROLES: Role[] = ["admin", "editor", "user", "viewer"];

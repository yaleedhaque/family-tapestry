// Server-side helpers that load relationship data from the DB and resolve
// a user's editable circle. Uses the service-role client (writes already go
// through service-role; this only READS to compute authorization).

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  computeCircle,
  isSelf,
  isSelfOrCircle,
  type CircleData,
  type Role,
} from "./permissions";

/**
 * Build the set of acceptable `created_by` values (rule 5.1):
 * the user themself + every approved editor/admin.
 */
export async function loadOkCreators(
  db: SupabaseClient,
  userId: string
): Promise<Set<string>> {
  const ok = new Set<string>();
  ok.add(userId);
  const { data } = await db.from("profiles").select("id, role, approved");
  for (const p of (data ?? []) as { id: string; role: string; approved: boolean }[]) {
    if (p.approved && (p.role === "admin" || p.role === "editor")) ok.add(p.id);
  }
  return ok;
}

/** Persons whose record represents the logged-in user (created_by === userId). */
export async function loadSelfPersonIds(
  db: SupabaseClient,
  userId: string
): Promise<string[]> {
  const { data } = await db.from("persons").select("id").eq("created_by", userId);
  return (data ?? []).map((r: { id: string }) => String(r.id));
}

export async function loadCircleData(
  db: SupabaseClient,
  userId: string
): Promise<CircleData> {
  const [okCreators, selfPersonIds, unions, parentEdges] = await Promise.all([
    loadOkCreators(db, userId),
    loadSelfPersonIds(db, userId),
    db.from("unions").select("id, partner_a, partner_b, created_by"),
    db.from("parent_edges").select("union_id, child_id, created_by"),
  ]);

  return computeCircle({
    selfPersonIds,
    unions: (unions.data ?? []).map((u: { id: string; partner_a: string; partner_b: string; created_by: string | null }) => ({
      id: String(u.id),
      partnerA: String(u.partner_a ?? ""),
      partnerB: String(u.partner_b ?? ""),
      createdBy: u.created_by ? String(u.created_by) : null,
    })),
    parentEdges: (parentEdges.data ?? []).map((e: { union_id: string; child_id: string; created_by: string | null }) => ({
      unionId: String(e.union_id),
      childId: String(e.child_id),
      createdBy: e.created_by ? String(e.created_by) : null,
    })),
    okCreators,
  });
}

export interface EditResolution {
  /** What the user may do with this person. */
  kind: "self" | "circle" | "none" | "any";
}

/**
 * Resolve how a user of `role` may edit `personId`.
 * - admin/editor → "any"
 * - user → "self" / "circle" / "none"
 * - viewer → "none"
 */
export function resolveEdit(role: Role, circle: CircleData, personId: string): EditResolution {
  if (role === "admin" || role === "editor") return { kind: "any" };
  if (role === "viewer") return { kind: "none" };
  if (role === "user") {
    if (isSelf(circle, personId)) return { kind: "self" };
    if (isSelfOrCircle(circle, personId)) return { kind: "circle" };
    return { kind: "none" };
  }
  return { kind: "none" };
}

export type { CircleData };

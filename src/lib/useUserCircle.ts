"use client";
// Client-side UI gating for the 4-tier permission model (spec 9.4).
// The server /api routes remain the authoritative security boundary; this
// hook only controls which edit controls are SHOWN to a "user" role.
import { useEffect, useMemo, useState } from "react";
import { computeCircle, type CircleData, type Role } from "./permissions";
import type { PersonLike, UnionLike, EdgeLike } from "@/components/InfoPanel";

export interface UserGate {
  role: Role;
  isEditorOrAdmin: boolean;
  canEditPerson: (pid: string) => boolean;
  canEditPrivate: (pid: string) => boolean;
  canDelete: boolean;
  locked: (pid: string) => boolean;
}

/**
 * For an admin/editor the gate grants everything. For a "viewer" nothing.
 * For a "user" it computes the editable circle (self + direct parents/partner/
 * children, guarded by trusted `created_by` edges) from the loaded graph and
 * uses it to decide where edit controls appear.
 */
export function useUserCircle(
  user: { id: string; role?: Role } | null,
  persons: PersonLike[],
  unions: UnionLike[],
  edges: EdgeLike[]
): UserGate {
  const role: Role = user?.role ?? "viewer";
  const isEditorOrAdmin = role === "admin" || role === "editor";

  // Approved editor/admin ids (plus the user themself) define which edges may
  // be trusted toward the user's circle (rule 5.1).
  const [okCreators, setOkCreators] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!user || role !== "user") return;
    let cancelled = false;
    (async () => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const { data, error } = await createClient()
          .from("profiles")
          .select("id, role, approved");
        if (error) throw error;
        const ids = new Set<string>([user.id]);
        for (const p of data ?? []) {
          if (p.approved && (p.role === "editor" || p.role === "admin")) ids.add(p.id);
        }
        if (!cancelled) setOkCreators(ids);
      } catch {
        if (!cancelled) setOkCreators(new Set([user.id]));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, role]);

  const circle = useMemo<CircleData | null>(() => {
    if (role !== "user" || !okCreators || !user) return null;
    const self = persons.filter((p) => p.createdBy === user.id).map((p) => p.id);
    return computeCircle({
      selfPersonIds: self,
      unions: unions.map((u) => ({
        id: u.id,
        partnerA: u.partnerA,
        partnerB: u.partnerB,
        createdBy: u.createdBy ?? null,
      })),
      parentEdges: edges.map((e) => ({
        unionId: e.unionId,
        childId: e.childId,
        createdBy: e.createdBy ?? null,
      })),
      okCreators,
    });
  }, [role, okCreators, persons, unions, edges, user]);

  return useMemo<UserGate>(
    () => ({
      role,
      isEditorOrAdmin,
      canEditPerson: (pid) => {
        if (isEditorOrAdmin) return true;
        if (role !== "user" || !circle) return false;
        return circle.circlePersonIds.has(pid);
      },
      canEditPrivate: (pid) => {
        if (isEditorOrAdmin) return true;
        if (role !== "user" || !circle) return false;
        return circle.selfPersonIds.has(pid);
      },
      canDelete: isEditorOrAdmin,
      locked: (pid) => role === "user" && !!circle && !circle.circlePersonIds.has(pid),
    }),
    [isEditorOrAdmin, role, circle]
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRealtimeTree } from "@/lib/supabase/realtime";
import type { DbPerson, DbUnion, DbParentEdge } from "@/lib/types";

export interface LiveTreeData {
  persons: DbPerson[];
  unions: DbUnion[];
  edges: DbParentEdge[];
  sources: Record<string, unknown>[];
  loading: boolean;
  refreshedAt: number;
  refetch: () => Promise<void>;
}

const emptySources: Record<string, unknown>[] = [];

export function useLiveTree(): LiveTreeData {
  const [persons, setPersons] = useState<DbPerson[]>([]);
  const [unions, setUnions] = useState<DbUnion[]>([]);
  const [edges, setEdges] = useState<DbParentEdge[]>([]);
  const [sources, setSources] = useState<Record<string, unknown>[]>(emptySources);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState(0);

  // Debounce multiple realtime events that arrive in a burst (e.g. a full-table
  // sync fires one INSERT per row) into a single /api/tree refetch.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const refetch = useCallback(async () => {
    try {
      const res = await fetch("/api/tree", { cache: "no-store" });
      if (!res.ok) return;
      const db = await res.json();
      if (!mountedRef.current) return;
      if (Array.isArray(db.persons)) setPersons(db.persons as DbPerson[]);
      if (Array.isArray(db.unions)) setUnions(db.unions as DbUnion[]);
      if (Array.isArray(db.edges)) setEdges(db.edges as DbParentEdge[]);
      if (Array.isArray(db.sources)) setSources(db.sources as Record<string, unknown>[]);
      setRefreshedAt(Date.now());
    } catch {
      /* keep last good snapshot */
    } finally {
      setLoading(false);
    }
  }, []);

  // Subscribe to the same realtime stream the tree canvas uses, then refetch the
  // whole tree whenever any row changes so map/timeline/person views stay in sync.
  const debouncedRefetch = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => void refetch(), 250);
  }, [refetch]);

  useRealtimeTree(debouncedRefetch);

  useEffect(() => {
    mountedRef.current = true;
    void refetch();
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [refetch]);

  // Refetch when the tab becomes visible again so switching back from the tree
  // (where edits happen) to the map/timeline always shows the latest data.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") void refetch();
    };
    const onFocus = () => void refetch();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
    };
  }, [refetch]);

  return { persons, unions, edges, sources, loading, refreshedAt, refetch };
}
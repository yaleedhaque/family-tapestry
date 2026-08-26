"use client";

import { useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { TreeChange, PresencePayload } from "@/lib/types";

export function useRealtimeTree(
  onChange: (change: TreeChange) => void
) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("tree-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "persons" },
        (payload) => onChangeRef.current({ ...payload, table: "persons" } as TreeChange)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "unions" },
        (payload) => onChangeRef.current({ ...payload, table: "unions" } as TreeChange)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "parent_edges" },
        (payload) => onChangeRef.current({ ...payload, table: "parent_edges" } as TreeChange)
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "life_events" },
        (payload) => onChangeRef.current({ ...payload, table: "life_events" } as TreeChange)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
}

export function useTreePresence(
  user: { id: string; name: string } | null,
  onPresenceSync: (viewers: PresencePayload[]) => void
) {
  const onPresenceSyncRef = useRef(onPresenceSync);
  onPresenceSyncRef.current = onPresenceSync;

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase.channel("tree-presence", {
      config: { presence: { key: user.id } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const viewers = Object.values(state).flat() as unknown as PresencePayload[];
        onPresenceSyncRef.current(viewers);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: user.id,
            userName: user.name,
            viewing: null,
            editing: null,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.name]);
}

export function useMemberLock(
  user: { id: string; name: string } | null,
  onLockChange: (locks: Map<string, string>) => void
) {
  const onLockChangeRef = useRef(onLockChange);
  onLockChangeRef.current = onLockChange;
  const lockedRef = useRef(new Map<string, string>());

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    const channel = supabase.channel("tree-locks");

    channel
      .on("broadcast", { event: "lock" }, ({ payload }) => {
        lockedRef.current.set(payload.memberId, payload.userName);
        onLockChangeRef.current(new Map(lockedRef.current));
      })
      .on("broadcast", { event: "unlock" }, ({ payload }) => {
        lockedRef.current.delete(payload.memberId);
        onLockChangeRef.current(new Map(lockedRef.current));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      lockedRef.current.clear();
    };
  }, [user?.id]);

  const lockMember = useCallback(async (memberId: string) => {
    if (!user) return;
    const supabase = createClient();
    await supabase.channel("tree-locks").send({
      type: "broadcast",
      event: "lock",
      payload: { memberId, userName: user.name, userId: user.id },
    });
  }, [user]);

  const unlockMember = useCallback(async (memberId: string) => {
    const supabase = createClient();
    await supabase.channel("tree-locks").send({
      type: "broadcast",
      event: "unlock",
      payload: { memberId },
    });
  }, []);

  return { lockMember, unlockMember };
}

"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type ChangePayload = {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
  table: string;
  schema: string;
};

export function useRealtimeSync(onChange: (payload: ChangePayload) => void) {
  useEffect(() => {
    const hasSupabase = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
    if (!hasSupabase) return;

    const supabase = createClient();
    const channels: RealtimeChannel[] = [];

    const tables = ["persons", "unions", "parent_edges"];

    for (const table of tables) {
      const channel = supabase
        .channel(`realtime:${table}`)
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table },
          (payload) => {
            onChange(payload as unknown as ChangePayload);
          }
        )
        .subscribe();

      channels.push(channel);
    }

    return () => {
      for (const ch of channels) {
        supabase.removeChannel(ch);
      }
    };
  }, [onChange]);
}

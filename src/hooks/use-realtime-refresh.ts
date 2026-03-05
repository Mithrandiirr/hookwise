"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const DEBOUNCE_MS = 1000;

export function useRealtimeRefresh(tables: string[]) {
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("realtime-refresh")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: tables[0] },
        () => scheduleRefresh()
      );

    // Subscribe to additional tables
    for (let i = 1; i < tables.length; i++) {
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table: tables[i] },
        () => scheduleRefresh()
      );
    }

    channel.subscribe();

    function scheduleRefresh() {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        router.refresh();
      }, DEBOUNCE_MS);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      supabase.removeChannel(channel);
    };
  }, [tables, router]);
}

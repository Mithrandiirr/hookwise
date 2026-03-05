"use client";

import { useRealtimeRefresh } from "@/hooks/use-realtime-refresh";

export function RealtimeRefresh({ tables }: { tables: string[] }) {
  useRealtimeRefresh(tables);
  return null;
}

"use client";

import { useState } from "react";
import { RotateCcw, Check } from "lucide-react";

export function ReplayButton({ eventId }: { eventId: string }) {
  const [loading, setLoading] = useState(false);
  const [replayed, setReplayed] = useState(false);

  async function handleReplay() {
    setLoading(true);
    try {
      const res = await fetch("/api/replay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventIds: [eventId] }),
      });
      if (res.ok) {
        setReplayed(true);
      }
    } finally {
      setLoading(false);
    }
  }

  if (replayed) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-400">
        <Check className="h-3 w-3" />
        Replay triggered
      </span>
    );
  }

  return (
    <button
      onClick={handleReplay}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 text-[12px] font-medium text-indigo-400 hover:bg-indigo-500/20 hover:border-indigo-500/30 transition-all disabled:opacity-40"
    >
      <RotateCcw
        className={`h-3 w-3 ${loading ? "animate-spin" : ""}`}
      />
      {loading ? "Replaying..." : "Replay"}
    </button>
  );
}

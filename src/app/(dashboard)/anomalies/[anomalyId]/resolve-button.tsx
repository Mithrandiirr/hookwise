"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle } from "lucide-react";

export function ResolveButton({ anomalyId }: { anomalyId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleResolve() {
    setLoading(true);
    try {
      const res = await fetch(`/api/anomalies/${anomalyId}/resolve`, {
        method: "POST",
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleResolve}
      disabled={loading}
      className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 text-[13px] font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
    >
      <CheckCircle className="h-3.5 w-3.5" />
      {loading ? "Resolving..." : "Mark resolved"}
    </button>
  );
}

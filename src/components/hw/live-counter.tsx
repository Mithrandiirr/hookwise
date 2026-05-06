"use client";

import { useEffect, useState } from "react";

export function LiveCounter({
  start = 1247,
  step = [1, 6],
  intervalMs = 1100,
}: {
  start?: number;
  step?: [number, number];
  intervalMs?: number;
}) {
  const [value, setValue] = useState(start);
  useEffect(() => {
    const [lo, hi] = step;
    const t = setInterval(() => {
      setValue((v) => v + Math.floor(Math.random() * (hi - lo + 1) + lo));
    }, intervalMs);
    return () => clearInterval(t);
  }, [intervalMs, step]);
  return <span>{value.toLocaleString()}</span>;
}

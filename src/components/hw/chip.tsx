import { clsx } from "clsx";
import type { CSSProperties, ReactNode } from "react";

type ChipTone = "green" | "amber" | "red" | "indigo";

export function Chip({
  tone,
  children,
  style,
  className,
}: {
  tone?: ChipTone;
  children: ReactNode;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <span className={clsx("hw-chip", tone, className)} style={style}>
      {children}
    </span>
  );
}

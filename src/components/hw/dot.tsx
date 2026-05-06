import { clsx } from "clsx";

export type DotTone = "green" | "amber" | "red" | "indigo" | "quiet";

export function Dot({ tone = "green", quiet = false }: { tone?: DotTone; quiet?: boolean }) {
  return <span className={clsx("hw-dot", tone, quiet && "quiet")} />;
}

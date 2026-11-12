import type { Tone } from "./KpiCard";

/** A small coloured label for a status such as PASS, FAIL or Matches. */
export function StatusPill({ tone, children }: { tone: Tone; children: string }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

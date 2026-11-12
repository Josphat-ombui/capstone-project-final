import type { ReactNode } from "react";

/** Key points for a group of charts. Closed by default so the page stays uncluttered. */
export function SectionSummary({ points }: { points: ReactNode[] }) {
  return (
    <details className="summary-box">
      <summary>Key points</summary>
      <ul>
        {points.map((point, index) => (
          <li key={index}>{point}</li>
        ))}
      </ul>
    </details>
  );
}

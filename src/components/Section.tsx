import type { ReactNode } from "react";

/** A titled group of cards with a one-line intro and a responsive grid. */
export function Section({ title, intro, children }: { title: string; intro?: string; children: ReactNode }) {
  return (
    <section className="section">
      <div className="section-heading">
        <h2>{title}</h2>
        {intro && <p>{intro}</p>}
      </div>
      <div className="grid">{children}</div>
    </section>
  );
}

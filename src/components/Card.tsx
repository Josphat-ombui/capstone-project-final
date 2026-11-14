import type { ReactNode } from "react";

interface CardProps {
  title: string;
  subtitle?: string;
  /** Kept for compatibility with existing pages. Not shown, to keep the layout quiet. */
  kind?: string;
  /** Kept for compatibility. Reading notes are no longer shown, so charts carry the message. */
  caption?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** A panel with a title, an optional subtitle, the content and an optional reading note. */
export function Card({ title, subtitle, actions, className = "", children }: CardProps) {
  return (
    <section className={`card ${className}`}>
      <header className="card-header">
        <div>
          <h3 className="card-title">{title}</h3>
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
        {actions && <div className="card-actions">{actions}</div>}
      </header>
      <div className="card-body">{children}</div>
    </section>
  );
}

import type { LucideIcon } from "lucide-react";

export type Tone = "accent" | "good" | "warn" | "bad" | "info" | "neutral";

interface KpiCardProps {
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
  icon: LucideIcon;
}

/** A headline number with an icon, a short label and one line of context. */
export function KpiCard({ label, value, hint, tone = "accent", icon: Icon }: KpiCardProps) {
  return (
    <article className={`kpi kpi-${tone}`}>
      <div className="kpi-icon" aria-hidden="true">
        <Icon size={20} strokeWidth={2.2} />
      </div>
      <div className="kpi-text">
        <p className="kpi-label">{label}</p>
        <p className="kpi-value">{value}</p>
        {hint && <p className="kpi-hint">{hint}</p>}
      </div>
    </article>
  );
}

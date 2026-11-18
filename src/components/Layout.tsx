import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import type { ThemeName } from "../lib/theme";

const tabs = [
  { to: "/", label: "Overview" },
  { to: "/exploration", label: "Explore" },
  { to: "/batch-alerts", label: "Alerts" },
  { to: "/predictor", label: "Predictor" },
  { to: "/equipment", label: "Equipment" },
  { to: "/process-control", label: "Process" },
  { to: "/receivables", label: "Credit" },
  { to: "/margin", label: "Margin" },
  { to: "/inventory", label: "Stock" },
  { to: "/costs", label: "Costs" },
];

interface LayoutProps {
  mode: string;
  generatedAt: string;
  theme: ThemeName;
  onToggleTheme: () => void;
  children: ReactNode;
}

/** Minimal frame: one row of tabs and a theme switch. */
export function Layout({ theme, onToggleTheme, children }: LayoutProps) {
  return (
    <div className="x-shell">
      <nav className="x-tabs" aria-label="Main">
        {tabs.map((t) => (
          <NavLink key={t.to} to={t.to} end={t.to === "/"} className={({ isActive }) => (isActive ? "x-tab active" : "x-tab")}>
            {t.label}
          </NavLink>
        ))}
        <button type="button" className="x-theme" onClick={onToggleTheme} aria-label="Switch theme">
          {theme === "light" ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
        </button>
      </nav>
      <main>{children}</main>
    </div>
  );
}

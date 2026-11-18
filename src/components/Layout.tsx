import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Moon, Printer, Sun } from "lucide-react";
import type { ThemeName } from "../lib/theme";
import { formatTimestamp } from "../lib/format";
import "../styles/dash.css";

/** The sidebar, grouped by the business area each page belongs to. */
const groups = [
  { title: "Overview", items: [{ to: "/", label: "Executive summary" }] },
  {
    title: "Quality and production",
    items: [
      { to: "/exploration", label: "Data and drivers" },
      { to: "/batch-alerts", label: "Batch alerts" },
      { to: "/predictor", label: "Batch predictor" },
      { to: "/equipment", label: "Equipment health" },
      { to: "/process-control", label: "Process control" },
    ],
  },
  {
    title: "Commercial and supply",
    items: [
      { to: "/receivables", label: "Credit and receivables" },
      { to: "/margin", label: "Margin and discounts" },
      { to: "/inventory", label: "Inventory and stock" },
      { to: "/costs", label: "Costs and suppliers" },
    ],
  },
];

interface LayoutProps {
  mode: string;
  generatedAt: string;
  theme: ThemeName;
  onToggleTheme: () => void;
  children: ReactNode;
}

/** Standard frame: grouped navigation, a top bar with the data date, print and theme controls. */
export function Layout({ mode, generatedAt, theme, onToggleTheme, children }: LayoutProps) {
  return (
    <div className="d-app">
      <aside className="d-side">
        <div className="d-brand">
          <span className="d-mark" aria-hidden="true">BQ</span>
          <div>
            <div className="d-brand-name">Batch Quality</div>
            <div className="d-brand-sub">Pipeline results</div>
          </div>
        </div>
        <nav className="d-nav" aria-label="Pages">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="d-nav-title">{group.title}</p>
              <ul className="d-nav-list">
                {group.items.map((item) => (
                  <li key={item.to}>
                    <NavLink to={item.to} end={item.to === "/"} className={({ isActive }) => (isActive ? "d-nav-link active" : "d-nav-link")}>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>
      <div className="d-main">
        <div className="d-topbar">
          <span className="d-topbar-meta">Data generated {formatTimestamp(generatedAt)} · {mode}</span>
          <button type="button" className="d-btn" onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" /> Print / save PDF
          </button>
          <button type="button" className="d-btn d-btn-icon" onClick={onToggleTheme} aria-label="Switch theme">
            {theme === "light" ? <Moon size={16} aria-hidden="true" /> : <Sun size={16} aria-hidden="true" />}
          </button>
        </div>
        <main className="d-content">{children}</main>
      </div>
    </div>
  );
}

import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Activity, BadgeDollarSign, Boxes, Calculator, LayoutDashboard, Moon, Printer, Receipt, Search, ShieldAlert, Sun, Truck, Wrench } from "lucide-react";
import type { ThemeName } from "../lib/theme";
import { formatTimestamp } from "../lib/format";

const navigation = [
  { to: "/", label: "Executive view", icon: LayoutDashboard },
  { to: "/summary", label: "Analyst summary", icon: LayoutDashboard },
  { to: "/exploration", label: "Data exploration", icon: Search },
  { to: "/batch-alerts", label: "Batch alerts", icon: ShieldAlert },
  { to: "/predictor", label: "Batch predictor", icon: Calculator },
  { to: "/equipment", label: "Equipment health", icon: Wrench },
  { to: "/process-control", label: "Process control", icon: Activity },
  { to: "/receivables", label: "Receivables", icon: Receipt },
  { to: "/margin", label: "Margin and discounts", icon: BadgeDollarSign },
  { to: "/inventory", label: "Inventory and stock", icon: Boxes },
  { to: "/costs", label: "Cost and suppliers", icon: Truck },
];

interface LayoutProps {
  mode: string;
  generatedAt: string;
  theme: ThemeName;
  onToggleTheme: () => void;
  children: ReactNode;
}

/** The app frame: a sidebar with navigation, a top bar with run status and theme switch, and the page. */
export function Layout({ mode, generatedAt, theme, onToggleTheme, children }: LayoutProps) {
  const isDevelopment = mode.toLowerCase().startsWith("development");
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">BQ</div>
          <div>
            <p className="brand-name">Batch Quality</p>
            <p className="brand-sub">Analytics platform</p>
          </div>
        </div>
        <nav aria-label="Main">
          <ul className="nav-list">
            {navigation.map((item) => (
              <li key={item.to}>
                <NavLink to={item.to} end={item.to === "/"} className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
                  <item.icon size={18} aria-hidden="true" />
                  <span>{item.label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="sidebar-footer">
          <p>Last pipeline run</p>
          <p className="muted">{formatTimestamp(generatedAt)}</p>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div className="topbar-status">
            <span className={`mode-badge ${isDevelopment ? "mode-dev" : "mode-prod"}`}>
              <span className="dot" aria-hidden="true" />
              {mode}
            </span>
            <span className="muted small">Identifiers masked to the last four characters</span>
          </div>
          <div className="topbar-actions">
            <button type="button" className="btn btn-ghost no-print" onClick={() => window.print()}>
              <Printer size={16} aria-hidden="true" /> Print / Save as PDF
            </button>
            <button type="button" className="icon-button" onClick={onToggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} theme`}>
              {theme === "light" ? <Moon size={18} aria-hidden="true" /> : <Sun size={18} aria-hidden="true" />}
            </button>
          </div>
        </header>
        <main className="content">{children}</main>
      </div>
    </div>
  );
}

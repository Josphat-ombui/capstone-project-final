import type { CSSProperties } from "react";
import { palette } from "./palette";

/** Tooltip box style. Inline styles can read CSS variables, so tooltips follow the theme. */
export const tooltipContentStyle: CSSProperties = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  color: "var(--text)",
  boxShadow: "var(--shadow-strong)",
  padding: "10px 12px",
  fontSize: 13,
};

/** Shared props for the X and Y axes of cartesian charts. */
export const axisProps = {
  stroke: palette.axis,
  fontSize: 12,
  tickLine: false,
  axisLine: false,
} as const;

/** Shared props for grid lines. */
export const gridProps = {
  stroke: palette.grid,
  strokeDasharray: "3 4",
  vertical: false,
} as const;

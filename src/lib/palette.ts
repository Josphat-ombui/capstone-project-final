/** Chart colours. Hex values are used because chart libraries do not read CSS variables reliably. */
export const palette = {
  accent: "#6366F1",
  accentSoft: "#A5B4FC",
  teal: "#14B8A6",
  good: "#10B981",
  warn: "#F59E0B",
  bad: "#F43F5E",
  info: "#0EA5E9",
  violet: "#8B5CF6",
  muted: "#94A3B8",
  axis: "#64748B",
  grid: "#E2E8F0",
} as const;

/** Colour for each machine priority level. */
export const priorityColour: Record<string, string> = {
  High: palette.bad,
  Watch: palette.warn,
  Standard: palette.muted,
};

/** Colour for each register result. */
export const resultColour: Record<string, string> = {
  PASS: palette.good,
  FLAG: palette.bad,
  INFO: palette.info,
  Matches: palette.good,
  Differs: palette.warn,
};

/** Series colours for charts that compare several items. */
export const seriesColours = [palette.accent, palette.teal, palette.warn, palette.violet, palette.info, palette.bad];

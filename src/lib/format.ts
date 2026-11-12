const integerFormatter = new Intl.NumberFormat("en-KE", { maximumFractionDigits: 0 });

/** Formats a whole number with thousands separators. */
export function formatInteger(value: number): string {
  return Number.isFinite(value) ? integerFormatter.format(Math.round(value)) : "-";
}

/** Formats a number with a fixed count of decimal places. */
export function formatNumber(value: number, digits = 2): string {
  return Number.isFinite(value)
    ? value.toLocaleString("en-KE", { minimumFractionDigits: digits, maximumFractionDigits: digits })
    : "-";
}

/** Formats a value that is already a percentage (for example 3.12 becomes "3.12%"). */
export function formatPercent(value: number, digits = 1): string {
  return Number.isFinite(value) ? `${formatNumber(value, digits)}%` : "-";
}

/** Formats a fraction between 0 and 1 as a percentage (for example 0.819 becomes "81.9%"). */
export function formatFraction(value: number, digits = 1): string {
  return Number.isFinite(value) ? `${formatNumber(value * 100, digits)}%` : "-";
}

/** Formats an amount in Kenya shillings in millions, with a leading minus for losses. */
export function formatKesMillions(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "-";
  const sign = value < 0 ? "-" : "";
  return `${sign}KES ${formatNumber(Math.abs(value) / 1_000_000, digits)} m`;
}

/** Formats an amount in Kenya shillings with thousands separators. */
export function formatKes(value: number): string {
  if (!Number.isFinite(value)) return "-";
  const sign = value < 0 ? "-" : "";
  return `${sign}KES ${formatInteger(Math.abs(value))}`;
}

/** Formats an ISO timestamp as a readable local date and time. */
export function formatTimestamp(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

/** Formats a date string (YYYY-MM-DD or ISO) as DD/MM/YYYY. */
export function formatDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

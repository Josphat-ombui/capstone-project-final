import type { Row } from "./data";

/** Escapes one value for CSV: quotes text that holds commas, quotes or line breaks. */
function escapeCsvValue(value: Row[string]): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Builds CSV text from rows, using the given column order. */
export function buildCsv(rows: Row[], columns: string[]): string {
  const header = columns.map(escapeCsvValue).join(",");
  const body = rows.map((row) => columns.map((column) => escapeCsvValue(row[column] ?? null)).join(","));
  return [header, ...body].join("\r\n");
}

/** Starts a browser download of rows as a CSV file. */
export function downloadCsv(fileName: string, rows: Row[], columns: string[]): void {
  const blob = new Blob([buildCsv(rows, columns)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

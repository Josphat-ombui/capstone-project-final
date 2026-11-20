import { numberCell, tableRows, textCell, type DashboardData, type Row } from "./data";

/** Sentinel value meaning "no restriction" for a filter. */
export const ALL = "All";

/** The filters shared by the dashboard. Years refer to the production year of a batch. */
export interface Filters {
  section: string;
  dosage: string;
  fromYear: number;
  toYear: number;
}

/** The years covered by the batch data. */
export const YEAR_RANGE = { min: 2007, max: 2026 } as const;

export const defaultFilters: Filters = {
  section: ALL,
  dosage: ALL,
  fromYear: YEAR_RANGE.min,
  toYear: YEAR_RANGE.max,
};

/** Values available to each filter, read from the exported monthly counts. */
export interface FilterOptions {
  sections: string[];
  dosageForms: string[];
}

/** Lists the sections and dosage forms present in the data, so the filters never offer an empty choice. */
export function buildFilterOptions(data: DashboardData): FilterOptions {
  const monthly = tableRows(data, "failure_monthly");
  const unique = (key: string) => [...new Set(monthly.map((row) => textCell(row, key)))].sort();
  return { sections: unique("manufacturing_section"), dosageForms: unique("dosage_form") };
}

/** True when at least one filter restricts the data. */
export function isFiltered(filters: Filters): boolean {
  return (
    filters.section !== ALL ||
    filters.dosage !== ALL ||
    filters.fromYear > YEAR_RANGE.min ||
    filters.toYear < YEAR_RANGE.max
  );
}

/** A short plain-language description of the active filters, for notices and captions. */
export function describeFilters(filters: Filters): string {
  if (!isFiltered(filters)) return "no filters";
  const parts: string[] = [];
  if (filters.section !== ALL) parts.push(`section ${filters.section}`);
  if (filters.dosage !== ALL) parts.push(`dosage form ${filters.dosage}`);
  if (filters.fromYear > YEAR_RANGE.min || filters.toYear < YEAR_RANGE.max) {
    parts.push(`production years ${filters.fromYear} to ${filters.toYear}`);
  }
  return parts.join(", ");
}

/** True when a year falls inside the range set by the filters. */
export function yearInRange(year: number, filters: Filters): boolean {
  return year >= filters.fromYear && year <= filters.toYear;
}

/**
 * True when a monthly count row passes the filters. Passing skipColumn leaves out one
 * dimension, so a breakdown by that dimension still shows every level.
 */
function passesMonthly(row: Row, filters: Filters, skipColumn?: "manufacturing_section" | "dosage_form"): boolean {
  if (skipColumn !== "manufacturing_section" && filters.section !== ALL && textCell(row, "manufacturing_section") !== filters.section) {
    return false;
  }
  if (skipColumn !== "dosage_form" && filters.dosage !== ALL && textCell(row, "dosage_form") !== filters.dosage) {
    return false;
  }
  return yearInRange(numberCell(row, "year"), filters);
}

/** Total batches and failures, and the failure rate, for rows that pass the filters. */
export function failureTotals(monthly: Row[], filters: Filters) {
  let batches = 0;
  let failures = 0;
  for (const row of monthly) {
    if (!passesMonthly(row, filters)) continue;
    batches += numberCell(row, "batches");
    failures += numberCell(row, "failures");
  }
  return { batches, failures, rate: batches > 0 ? failures / batches : Number.NaN };
}

/** One level of a breakdown: counts, rate and the level name. */
export interface LevelRate {
  level: string;
  batches: number;
  failures: number;
  rate: number;
}

export type BreakdownColumn = "maintenance_status" | "dosage_form" | "manufacturing_section" | "age_band" | "operator_band";

/** Failure counts for each level of one dimension, applying the filters to the other dimensions. */
export function failureByLevel(monthly: Row[], filters: Filters, column: BreakdownColumn): LevelRate[] {
  const skip = column === "dosage_form" || column === "manufacturing_section" ? column : undefined;
  const totals = new Map<string, { batches: number; failures: number }>();
  for (const row of monthly) {
    if (!passesMonthly(row, filters, skip)) continue;
    const level = textCell(row, column);
    const current = totals.get(level) ?? { batches: 0, failures: 0 };
    current.batches += numberCell(row, "batches");
    current.failures += numberCell(row, "failures");
    totals.set(level, current);
  }
  return [...totals.entries()]
    .map(([level, value]) => ({ level, ...value, rate: value.batches > 0 ? value.failures / value.batches : Number.NaN }))
    .sort((first, second) => first.level.localeCompare(second.level));
}

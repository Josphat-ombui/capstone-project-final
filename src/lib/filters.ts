import { numberCell, tableRows, textCell, type DashboardData, type Row } from "./data";

/** The years covered by the batch data. */
export const YEAR_RANGE = { min: 2007, max: 2026 } as const;

/** Filter dimensions that can hold several selected values. An empty list means "all". */
export type Dimension = "sections" | "dosages" | "maintenance" | "ageBands" | "operatorBands" | "branches";

/** The dashboard-wide filter selection. Years refer to the production year of a batch. */
export interface Filters {
  sections: string[];
  dosages: string[];
  maintenance: string[];
  ageBands: string[];
  operatorBands: string[];
  branches: string[];
  fromYear: number;
  toYear: number;
}

export const defaultFilters: Filters = {
  sections: [],
  dosages: [],
  maintenance: [],
  ageBands: [],
  operatorBands: [],
  branches: [],
  fromYear: YEAR_RANGE.min,
  toYear: YEAR_RANGE.max,
};

/** Plain-language labels for each dimension, used in chips, headings and notices. */
export const DIMENSION_LABELS: Record<Dimension, string> = {
  sections: "Section",
  dosages: "Dosage form",
  maintenance: "Maintenance",
  ageBands: "Equipment age",
  operatorBands: "Operator experience",
  branches: "Branch",
};

/** The batch-level dimensions, in the order the filter panel shows them. */
export const BATCH_DIMENSIONS: Dimension[] = ["sections", "dosages", "maintenance", "ageBands", "operatorBands"];

/** Values available to each filter, read from the exported tables. */
export interface FilterOptions {
  sections: string[];
  dosages: string[];
  maintenance: string[];
  ageBands: string[];
  operatorBands: string[];
  branches: string[];
}

const MAINTENANCE_ORDER = ["Current", "Due Soon", "Critical"];

/** Lists the values present in the data, so the filters never offer an empty choice. */
export function buildFilterOptions(data: DashboardData): FilterOptions {
  const monthly = tableRows(data, "failure_monthly");
  const unique = (key: string) => [...new Set(monthly.map((row) => textCell(row, key)))].sort();
  const branches = [...new Set(tableRows(data, "reorder_points").map((row) => textCell(row, "Branch_Code")))].sort();
  const maintenance = unique("maintenance_status").sort((a, b) => MAINTENANCE_ORDER.indexOf(a) - MAINTENANCE_ORDER.indexOf(b));
  return {
    sections: unique("manufacturing_section"),
    dosages: unique("dosage_form"),
    maintenance,
    ageBands: unique("age_band"),
    operatorBands: unique("operator_band"),
    branches,
  };
}

/** True when a year range restricts the batch years. */
export function yearRestricted(filters: Filters): boolean {
  return filters.fromYear > YEAR_RANGE.min || filters.toYear < YEAR_RANGE.max;
}

/** The number of active restrictions, counting each dimension and the year range once. */
export function activeFilterCount(filters: Filters): number {
  const lists = [filters.sections, filters.dosages, filters.maintenance, filters.ageBands, filters.operatorBands, filters.branches];
  return lists.filter((list) => list.length > 0).length + (yearRestricted(filters) ? 1 : 0);
}

/** True when at least one filter restricts the data. */
export function isFiltered(filters: Filters): boolean {
  return activeFilterCount(filters) > 0;
}

/** The selected values of one list dimension. */
export function valuesOf(filters: Filters, dimension: Dimension): string[] {
  return filters[dimension];
}

/** Adds the value when absent and removes it when present. */
export function toggleValue(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

/** A short plain-language description of the active filters, for notices and captions. */
export function describeFilters(filters: Filters): string {
  if (!isFiltered(filters)) return "no filters";
  const parts: string[] = [];
  for (const dimension of [...BATCH_DIMENSIONS, "branches"] as Dimension[]) {
    const values = filters[dimension];
    if (values.length > 0) parts.push(`${DIMENSION_LABELS[dimension].toLowerCase()} ${values.join(" or ")}`);
  }
  if (yearRestricted(filters)) parts.push(`production years ${filters.fromYear} to ${filters.toYear}`);
  return parts.join(", ");
}

/** True when a year falls inside the range set by the filters. */
export function yearInRange(year: number, filters: Filters): boolean {
  return year >= filters.fromYear && year <= filters.toYear;
}

/** Maps a breakdown column to the filter dimension that governs it. */
export type BreakdownColumn = "maintenance_status" | "dosage_form" | "manufacturing_section" | "age_band" | "operator_band";

export const COLUMN_DIMENSION: Record<BreakdownColumn, Dimension> = {
  maintenance_status: "maintenance",
  dosage_form: "dosages",
  manufacturing_section: "sections",
  age_band: "ageBands",
  operator_band: "operatorBands",
};

/** True when one batch's section, dosage form and year pass the filters (used by batch-level lists). */
export function passesBatch(section: string, dosage: string, year: number, filters: Filters): boolean {
  if (filters.sections.length > 0 && !filters.sections.includes(section)) return false;
  if (filters.dosages.length > 0 && !filters.dosages.includes(dosage)) return false;
  return yearInRange(year, filters);
}

/** True when a branch code passes the branch filter. */
export function passesBranch(branch: string, filters: Filters): boolean {
  return filters.branches.length === 0 || filters.branches.includes(branch);
}

/**
 * True when a monthly count row passes the filters. Passing skip leaves out one dimension,
 * so a breakdown by that dimension still shows every level.
 */
function passesMonthly(row: Row, filters: Filters, skip?: Dimension): boolean {
  const checks: [Dimension, string][] = [
    ["sections", "manufacturing_section"],
    ["dosages", "dosage_form"],
    ["maintenance", "maintenance_status"],
    ["ageBands", "age_band"],
    ["operatorBands", "operator_band"],
  ];
  for (const [dimension, column] of checks) {
    if (dimension === skip) continue;
    const values = filters[dimension];
    if (values.length > 0 && !values.includes(textCell(row, column))) return false;
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

/** Failure counts for each level of one dimension, applying the filters to the other dimensions. */
export function failureByLevel(monthly: Row[], filters: Filters, column: BreakdownColumn): LevelRate[] {
  const skip = COLUMN_DIMENSION[column];
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

/** Failure rate by year for rows that pass the filters, in year order. */
export function failureByYear(monthly: Row[], filters: Filters): { year: number; batches: number; failures: number; rate: number }[] {
  const totals = new Map<number, { batches: number; failures: number }>();
  for (const row of monthly) {
    if (!passesMonthly(row, filters)) continue;
    const year = numberCell(row, "year");
    const current = totals.get(year) ?? { batches: 0, failures: 0 };
    current.batches += numberCell(row, "batches");
    current.failures += numberCell(row, "failures");
    totals.set(year, current);
  }
  return [...totals.entries()]
    .map(([year, value]) => ({ year, ...value, rate: value.batches > 0 ? value.failures / value.batches : Number.NaN }))
    .sort((first, second) => first.year - second.year);
}

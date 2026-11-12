import type { PredictorSpec } from "./predictor";
import { createContext, useContext, useEffect, useState } from "react";

/** One cell of a pipeline table. Missing values arrive as null. */
export type Cell = string | number | null;
/** One row of a pipeline table, keyed by column name. */
export type Row = Record<string, Cell>;

export interface ClassifierResult {
  model: string;
  threshold: number;
  roc_auc: number;
  pr_auc: number;
  precision: number;
  recall: number;
  f1: number;
  brier: number;
  flag_rate: number;
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

/** The parts of summary.json the dashboard reads. Every value is computed by the pipeline. */
export interface Summary {
  mode: string;
  input_checksums: Record<string, string>;
  rows: { batches: number; sales: number; inventory: number };
  quality_checks: { checks: number; pass: number; info: number };
  failure_rate_pct: number;
  classifier: {
    chosen: string;
    thresholds: Record<string, number>;
    notes: string[];
    test: ClassifierResult[];
    validation: ClassifierResult[];
    meets_recall_target_on_test: boolean;
    meets_precision_target_on_test: boolean;
    meets_roc_auc_target_on_test: boolean;
    alerts_on_test: number;
  };
  discount: {
    full_period: {
      pct_per_point: number;
      pct_low: number;
      pct_high: number;
      r_squared: number;
      orders: number;
      fitted_years: string;
    };
    cap_pct: number;
    overall_margin_pct: number;
    fitted_to_validation_end?: { pct_per_point: number; pct_low: number; pct_high: number };
  };
  credit_gate: {
    status: string;
    spread_points: number;
    latest_year_open_share: number;
    reason: string;
  };
  cost_trend: { growth_pct_per_year: number; low_pct: number; high_pct: number; receipts: number; products: number };
  product_year_spread: { product_years: number; with_more_than_one_cost: number; largest_spread_KES: number };
  forecast: {
    selection_year: number;
    holdout_year: number;
    chosen_method: string;
    improvement_vs_seasonal_naive_pct: number;
    target_met: boolean;
    series_count: number;
  };
  assumptions: {
    discount_cap_pct: number;
    lead_times_days: number[];
    service_z: number;
    assay_limits: number[];
    risk_weights: { quality: number; equipment: number; process: number };
    high_risk_tier_share: number;
  };
  risk_cut_validation_score: number;
  maintenance_failure_mode_majority: string;
  generatedAt?: string;
}

export interface DashboardData {
  meta: {
    generatedAt: string;
    summarySha256: string;
    mode: string;
    identifierMasking: string;
    alertRowsIncluded: number;
  };
  summary: Summary;
  tables: Record<string, Row[]>;
  predictor?: PredictorSpec;
  notebookCheck?: { agree: number; total: number; checks: { item: string; notebook: number; dashboard: number; agree: boolean }[] };
  /** Descriptive statistics for the data exploration page. */
  explore?: ExploreData;
}

/** One bin of a histogram. */
export interface HistogramBin {
  start: number;
  end: number;
  count: number;
}

/** Five-number summary and outlier count for one numeric column. */
export interface BoxStats {
  n: number;
  min: number;
  whisker_low: number;
  q1: number;
  median: number;
  q3: number;
  whisker_high: number;
  max: number;
  mean: number;
  outliers: number;
}

/** Batch counts and failures for one category level. */
export interface CategoryCount {
  level: string;
  batches: number;
  failures: number;
  failure_rate_pct: number;
}

/** Share of values that are missing for one column. */
export interface MissingValue {
  table: string;
  column: string;
  missing: number;
  share_pct: number;
}

/** One month of batch counts and failure rate. */
export interface MonthlyTrend {
  month: string;
  batches: number;
  failures: number;
  failure_rate_pct: number;
}

/** Descriptive statistics computed by the pipeline for the batch file. */
export interface ExploreData {
  batches_total: number;
  histograms: Record<string, HistogramBin[]>;
  box_stats: Record<string, BoxStats>;
  category_counts: Record<string, CategoryCount[]>;
  missing_values: MissingValue[];
  correlations: { columns: string[]; matrix: number[][] };
  monthly_trend: MonthlyTrend[];
  roc: { auc: number; points: { fpr: number; tpr: number }[] };
  inventory_rows: number;
}

/** Gives every page access to the loaded data, so shared panels (for example the question summaries) can read it. */
export const DashboardContext = createContext<DashboardData | null>(null);

/** Returns the loaded dashboard data. Must be used inside the dashboard, where the provider is set. */
export function useDashboard(): DashboardData {
  const data = useContext(DashboardContext);
  if (!data) throw new Error("useDashboard must be used inside DashboardContext.Provider");
  return data;
}

export type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; data: DashboardData };

/** Loads the exported dashboard JSON once when the app starts. */
export function useDashboardData(): LoadState {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let active = true;
    const url = `${import.meta.env.BASE_URL}data/dashboard.json`;
    fetch(url)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load ${url} (HTTP ${response.status}). Run the export step first.`);
        }
        return response.json() as Promise<DashboardData>;
      })
      .then((data) => {
        if (active) setState({ status: "ready", data });
      })
      .catch((error: unknown) => {
        if (active) setState({ status: "error", message: error instanceof Error ? error.message : String(error) });
      });
    return () => {
      active = false;
    };
  }, []);

  return state;
}

/** Returns the rows of a named table, or an empty list if the table is absent. */
export function tableRows(data: DashboardData, name: string): Row[] {
  return data.tables[name] ?? [];
}

/** Reads a numeric cell. Non-numeric or missing values become NaN. */
export function numberCell(row: Row, key: string): number {
  const value = row[key];
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
}

/** Reads a text cell as a string, with an empty string for missing values. */
export function textCell(row: Row, key: string): string {
  const value = row[key];
  return value === null || value === undefined ? "" : String(value);
}

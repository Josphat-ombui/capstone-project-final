/**
 * Browser-side batch scorer. It reproduces the adopted logistic model exactly from the exported
 * coefficients: impute, standardise, take the linear score, then map it to a calibrated failure chance.
 */

export interface NumericInput {
  name: string;
  label: string;
  typical: number;
  /** 5th percentile of the training period. */
  low: number;
  /** 95th percentile of the training period. */
  high: number;
}

export interface PredictorSpec {
  model: string;
  inputs: {
    numeric: NumericInput[];
    dosage_forms: string[];
    sections: string[];
    maintenance_statuses: string[];
  };
  columns: string[];
  imputer_median: number[];
  scaler_mean: number[];
  scaler_scale: number[];
  coefficients: number[];
  intercept: number;
  calibration: { slope: number; intercept: number; fitted_on: string };
  threshold_raw: number;
  base_rate_test: number;
  calibration_check: { decile: number; predicted: number; observed: number; batches: number }[];
  notes: string[];
}

/** The batch the user describes. Categories not listed here use the baseline (Tablet, Oral Solids, Current). */
export interface BatchForm {
  numeric: Record<string, number>;
  dosage: string;
  section: string;
  maintenance: string;
}

export interface Factor {
  column: string;
  label: string;
  /** Change in the linear score against the typical batch. Positive raises the predicted risk. */
  effect: number;
}

export interface Prediction {
  failureChance: number;
  successRate: number;
  rawProbability: number;
  flagged: boolean;
  riskLevel: "High" | "Elevated" | "Lower";
  typicalFailureChance: number;
  factors: Factor[];
  outsideRange: string[];
}

const BASELINE_DOSAGE = "Tablet";
const BASELINE_SECTION = "Oral Solids";
const BASELINE_MAINTENANCE = "Current";

const sigmoid = (value: number) => 1 / (1 + Math.exp(-value));

/** The form that describes a typical batch, taken from the training-period medians. */
export function typicalForm(spec: PredictorSpec): BatchForm {
  const numeric: Record<string, number> = {};
  for (const input of spec.inputs.numeric) numeric[input.name] = input.typical;
  return { numeric, dosage: BASELINE_DOSAGE, section: BASELINE_SECTION, maintenance: BASELINE_MAINTENANCE };
}

/** Reads one model column from the form. Indicator columns are derived from the category choices. */
function columnValue(column: string, form: BatchForm): number {
  if (column === "maintenance_due_soon") return form.maintenance === "Due Soon" ? 1 : 0;
  if (column === "maintenance_critical") return form.maintenance === "Critical" ? 1 : 0;
  if (column.startsWith("dosage_")) return form.dosage === column.slice("dosage_".length) ? 1 : 0;
  if (column.startsWith("section_")) return form.section === column.slice("section_".length) ? 1 : 0;
  return form.numeric[column];
}

/** Imputes missing values with the training medians, then standardises each column. */
function standardised(form: BatchForm, spec: PredictorSpec): number[] {
  return spec.columns.map((column, index) => {
    let value = columnValue(column, form);
    if (!Number.isFinite(value)) value = spec.imputer_median[index];
    return (value - spec.scaler_mean[index]) / spec.scaler_scale[index];
  });
}

/** The linear score of the logistic model (the decision function before calibration). */
function linearScore(z: number[], spec: PredictorSpec): number {
  return spec.intercept + z.reduce((total, value, index) => total + spec.coefficients[index] * value, 0);
}

function factorLabel(column: string, form: BatchForm, spec: PredictorSpec): string {
  const numeric = spec.inputs.numeric.find((input) => input.name === column);
  if (numeric) return numeric.label;
  if (column.startsWith("dosage_")) return `Dosage form: ${column.slice("dosage_".length)}`;
  if (column.startsWith("section_")) return `Section: ${column.slice("section_".length)}`;
  return `Maintenance: ${form.maintenance}`;
}

/** Scores one batch against the adopted model and explains the score against a typical batch. */
export function predict(spec: PredictorSpec, form: BatchForm): Prediction {
  const { slope, intercept } = spec.calibration;
  const typical = typicalForm(spec);
  const z = standardised(form, spec);
  const zTypical = standardised(typical, spec);

  const raw = linearScore(z, spec);
  const failureChance = sigmoid(slope * raw + intercept);
  const typicalFailureChance = sigmoid(slope * linearScore(zTypical, spec) + intercept);
  const base = spec.base_rate_test;
  const riskLevel = failureChance >= 2 * base ? "High" : failureChance >= base ? "Elevated" : "Lower";

  const factors: Factor[] = spec.columns
    .map((column, index) => ({
      column,
      label: factorLabel(column, form, spec),
      effect: spec.coefficients[index] * (z[index] - zTypical[index]),
    }))
    .filter((factor) => Math.abs(factor.effect) > 1e-4)
    .sort((first, second) => Math.abs(second.effect) - Math.abs(first.effect));

  const outsideRange = spec.inputs.numeric
    .filter((input) => {
      const value = form.numeric[input.name];
      return Number.isFinite(value) && (value < input.low || value > input.high);
    })
    .map((input) => input.label);

  return {
    failureChance,
    successRate: 1 - failureChance,
    rawProbability: sigmoid(raw),
    flagged: sigmoid(raw) >= spec.threshold_raw,
    riskLevel,
    typicalFailureChance,
    factors,
    outsideRange,
  };
}

/**
 * Project targets. They are not in the data, so they are declared once here
 * and labelled as targets wherever they appear.
 */
export const targets = {
  recall: 0.8,
  precision: 0.19,
  rocAuc: 0.8,
  forecastGainPct: 15,
  cpk: 1.33,
  hhiThreshold: 1500,
} as const;

/** Short model name for chart labels, for example "Logistic regression (baseline)" becomes "Logistic regression". */
export function shortModelName(name: string): string {
  return name.split(" (")[0];
}

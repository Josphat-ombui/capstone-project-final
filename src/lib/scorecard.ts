import { type DashboardData, numberCell, tableRows, textCell } from "./data";
import { targets } from "./targets";

export interface TargetRow { label: string; result: string; goal: string; met: boolean; v: number; t: number; display: string }

/** The five project targets, in the order the final presentation lists them. */
export function buildTargets(data: DashboardData): TargetRow[] {
  const c = data.summary.classifier;
  const m = c.test.find((r) => r.model.startsWith("Logistic")) ?? c.test[0];
  const gain = data.summary.forecast.improvement_vs_seasonal_naive_pct;
  const crit = tableRows(data, "maintenance_logit").find((r) => textCell(r, "term") === "Maintenance: Critical") ?? {};
  const or = numberCell(crit, "odds_ratio"), lo = numberCell(crit, "or_ci_low"), hi = numberCell(crit, "or_ci_high");
  const p = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`;
  return [
    { label: "Failures caught (recall)", result: p(m.recall), goal: `at least ${p(targets.recall, 0)}`, met: m.recall >= targets.recall, v: m.recall, t: targets.recall, display: p(m.recall, 0) },
    { label: "Precision", result: p(m.precision), goal: `at least ${p(targets.precision, 0)}`, met: m.precision >= targets.precision, v: m.precision, t: targets.precision, display: p(m.precision, 0) },
    { label: "ROC-AUC", result: m.roc_auc.toFixed(3), goal: `at least ${targets.rocAuc.toFixed(2)}`, met: m.roc_auc >= targets.rocAuc, v: m.roc_auc, t: targets.rocAuc, display: m.roc_auc.toFixed(2) },
    { label: "Critical maintenance effect", result: `${or.toFixed(2)} (${lo.toFixed(2)} to ${hi.toFixed(2)})`, goal: "effect with interval", met: lo > 1, v: or / 4, t: 1 / 4, display: `${or.toFixed(1)}×` },
    { label: "Forecast gain", result: `${gain.toFixed(1)}%`, goal: `at least ${targets.forecastGainPct}%`, met: gain >= targets.forecastGainPct, v: gain / 30, t: targets.forecastGainPct / 30, display: `${gain.toFixed(0)}%` },
  ];
}

import { numberCell, tableRows, textCell, type DashboardData, type Row } from "./data";
import { formatFraction, formatInteger, formatKesMillions, formatNumber, formatPercent } from "./format";
import { predict, typicalForm, type PredictorSpec } from "./predictor";
import { targets } from "./targets";

/**
 * The questions the project answers. Each one has the same six parts (question, why it matters, method,
 * target, findings, meaning). Every number in the findings is computed here from the exported data, so the
 * master table and the page panels always show the same text.
 */
export interface Question {
  id: string;
  number: number;
  /** Route of the page that holds the detail. */
  route: string;
  pageTitle: string;
  /** A. The question, in one plain sentence. */
  question: string;
  /** One line in plain words, shown first in the panel. */
  plainWords: string;
  /** B. Why it matters, in business terms. */
  why: string;
  /** C. Model or method, by name. */
  method: string;
  /** C. What the method does, in one plain line. */
  methodPlain: string;
  /** D. What we were trying to measure or predict, and the target. */
  target: string;
  /** E. Three to five findings, each with a number. The first one is the key result in the master table. */
  findings: string[];
  /** F. What it means for the business or decision. */
  meaning: string;
  /** Keys of the glossary entries shown in the "What is this?" box. */
  glossaryKeys: string[];
}

const share = (value: number, digits = 1) => formatFraction(value, digits);
const percent = (value: number, digits = 2) => formatPercent(value, digits);
const num = (value: number, digits = 2) => formatNumber(value, digits);
const kes = (value: number) => formatKesMillions(value, 1);

/** Sum of one numeric column across rows. */
function sum(rows: Row[], key: string): number {
  return rows.reduce((total, row) => total + numberCell(row, key), 0);
}

/** The row with the largest value in a column. Returns an empty row for an empty list. */
function rowWithMax(rows: Row[], key: string): Row {
  return rows.reduce((best, row) => (numberCell(row, key) > numberCell(best, key) ? row : best), rows[0] ?? {});
}

/** The row with the smallest value in a column. Returns an empty row for an empty list. */
function rowWithMin(rows: Row[], key: string): Row {
  return rows.reduce((best, row) => (numberCell(row, key) < numberCell(best, key) ? row : best), rows[0] ?? {});
}

/** Median of a list of numbers. */
function median(values: number[]): number {
  const sorted = values.filter(Number.isFinite).sort((first, second) => first - second);
  if (sorted.length === 0) return Number.NaN;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/** Failure-rate rows for one factor, as level and fraction. */
function factorLevels(data: DashboardData, factor: string): Row[] {
  return tableRows(data, "failure_rates").filter((row) => textCell(row, "factor") === factor);
}

/** Question 1: is the data complete and linked? */
function dataQuality(data: DashboardData): Question {
  const { summary } = data;
  const register = tableRows(data, "quality_register");
  const link = register.find((row) => textCell(row, "check") === "Batch IDs match maintenance IDs") ?? {};
  const missing = data.explore?.missing_values ?? [];
  const withMissing = missing.filter((row) => row.missing > 0);
  const worst = withMissing.reduce((best, row) => (row.share_pct > best.share_pct ? row : best), withMissing[0]);
  const split = tableRows(data, "split_summary");
  const train = split.find((row) => textCell(row, "period") === "train") ?? {};
  const validation = split.find((row) => textCell(row, "period") === "validation") ?? {};
  const test = split.find((row) => textCell(row, "period") === "test") ?? {};
  const notebook = data.notebookCheck;

  const missingFinding =
    withMissing.length === 0
      ? `No checked column has missing values (${formatInteger(missing.length)} columns checked).`
      : `${formatInteger(withMissing.length)} of ${formatInteger(missing.length)} checked columns have missing values. The worst is ${worst?.column ?? "none"} at ${num(worst?.share_pct ?? Number.NaN, 2)}%.`;

  return {
    id: "data-quality",
    number: 0,
    route: "/exploration",
    pageTitle: "Data exploration",
    question: "Is the data complete, and do the records link correctly?",
    plainWords: "The records are checked before any result is trusted. Missing values and broken links would change the answers.",
    why: "Results are only as reliable as the records behind them. Checks show what the data can and cannot support.",
    method: "Automatic data checks, missing-value counts and a notebook consistency check",
    methodPlain: "Counts rows, links batch and maintenance records, and counts blank cells in each column.",
    target: "All automatic checks pass, and the notebook agrees with the dashboard on every figure.",
    findings: [
      `${formatInteger(summary.quality_checks.pass)} of ${formatInteger(summary.quality_checks.checks)} automatic data checks pass. ${formatInteger(summary.quality_checks.info)} are for information only.`,
      `Batch and maintenance records link for ${textCell(link, "observed") || "all"} of batches.`,
      missingFinding,
      notebook
        ? `The analysis notebook agrees with this dashboard on ${formatInteger(notebook.agree)} of ${formatInteger(notebook.total)} figures.`
        : "The notebook check has not been run for this export.",
      `Split by time: ${formatInteger(numberCell(train, "batches"))} training batches (2007 to 2021), ${formatInteger(numberCell(validation, "batches"))} validation (2022 to 2023) and ${formatInteger(numberCell(test, "batches"))} test batches (2024 to 2026).`,
    ],
    meaning: "The records are linked and complete enough for these results. Checks that are only for information are explained on the page where they apply.",
    glossaryKeys: ["missing-values", "validation-test"],
  };
}

/** Question 2: which batch factors go with failure? */
function factorQuestion(data: DashboardData): Question {
  const tests = tableRows(data, "factor_tests");
  const significant = tests.filter((row) => numberCell(row, "p_value") < 0.05).length;
  const operator = factorLevels(data, "operator_band");
  const age = factorLevels(data, "age_band");
  const dosage = factorLevels(data, "dosage_form");
  const maintenance = factorLevels(data, "maintenance_status");
  const critical = maintenance.find((row) => textCell(row, "level") === "Critical") ?? {};
  const current = maintenance.find((row) => textCell(row, "level") === "Current") ?? {};
  const operatorHigh = rowWithMax(operator, "failure_rate");
  const operatorLow = rowWithMin(operator, "failure_rate");
  const ageHigh = rowWithMax(age, "failure_rate");
  const ageLow = rowWithMin(age, "failure_rate");
  const dosageHigh = rowWithMax(dosage, "failure_rate");

  return {
    id: "factors",
    number: 0,
    route: "/batch-alerts",
    pageTitle: "Batch alerts",
    question: "Which batch factors go with a higher failure rate?",
    plainWords: "Some batch settings fail more often than others. A link is a clue for QA to check, not proof of cause.",
    why: "Knowing which factors go with failure tells QA where to look first.",
    method: "Chi-square tests of independence and failure rates with 95% ranges",
    methodPlain: "Checks whether each factor is linked to failure more than chance alone would explain.",
    target: "A factor counts as linked when its p-value is below 0.05.",
    findings: [
      `${formatInteger(significant)} of ${formatInteger(tests.length)} factors are linked to failure at the 5% level.`,
      `Operator experience: ${textCell(operatorHigh, "level")} batches fail at ${share(numberCell(operatorHigh, "failure_rate"))}, against ${share(numberCell(operatorLow, "failure_rate"))} for ${textCell(operatorLow, "level")}.`,
      `Equipment age: ${textCell(ageHigh, "level")} fail at ${share(numberCell(ageHigh, "failure_rate"))}, against ${share(numberCell(ageLow, "failure_rate"))} for ${textCell(ageLow, "level")}.`,
      `Dosage form: ${textCell(dosageHigh, "level")} has the highest failure rate, at ${share(numberCell(dosageHigh, "failure_rate"))}.`,
      `Critical maintenance: ${share(numberCell(critical, "failure_rate"))} fail, against ${share(numberCell(current, "failure_rate"))} for batches on Current maintenance.`,
    ],
    meaning: "Factors with a p-value below 0.05 go with failure rates. A link shows association, not cause, so confirm before acting on it.",
    glossaryKeys: ["failure-rate", "chi-square", "p-value", "confidence-interval"],
  };
}

/** Question 3: does the classifier find failing batches? */
function classifierQuestion(data: DashboardData): Question {
  const { summary } = data;
  const models = summary.classifier.test;
  const chosen = models.find((row) => row.model.startsWith("Logistic")) ?? models[0];
  const forest = models.find((row) => row.model.startsWith("Random")) ?? chosen;
  const boosting = models.find((row) => row.model.startsWith("XGBoost")) ?? chosen;
  const testSplit = tableRows(data, "split_summary").find((row) => textCell(row, "period") === "test") ?? {};
  const testRate = numberCell(testSplit, "failure_rate_pct") / 100;
  const top = tableRows(data, "decile_lift_test").find((row) => numberCell(row, "decile") === 1) ?? {};

  const missed: string[] = [];
  if (chosen.recall < targets.recall) missed.push("recall");
  if (chosen.precision < targets.precision) missed.push("precision");
  if (chosen.roc_auc < targets.rocAuc) missed.push("ROC-AUC");
  const best = chosen.roc_auc >= Math.max(forest.roc_auc, boosting.roc_auc);

  return {
    id: "classifier",
    number: 0,
    route: "/batch-alerts",
    pageTitle: "Batch alerts",
    question: "Can the model flag batches that are likely to fail?",
    plainWords: "The model flags risky batches so QA can check them first. It catches most failures but raises many false alarms.",
    why: "QA time is limited. A good flag sends reviewers to the batches most likely to fail.",
    method: "Logistic regression (adopted), compared with random forest and gradient boosting",
    methodPlain: "Adds up weighted batch measurements into one risk score, then flags batches above a threshold set on validation data.",
    target: `Recall ${share(targets.recall, 0)} or more, precision ${share(targets.precision, 0)} or more, ROC-AUC ${num(targets.rocAuc)} or more.`,
    findings: [
      `Catches ${share(chosen.recall)} of failing batches in 2024 to 2026 (${formatInteger(chosen.tp)} of ${formatInteger(chosen.tp + chosen.fn)}), ${chosen.recall >= targets.recall ? "meeting" : "missing"} the ${share(targets.recall, 0)} recall target.`,
      `Only ${share(chosen.precision)} of flagged batches fail, ${chosen.precision >= targets.precision ? "meeting" : "below"} the ${share(targets.precision, 0)} precision target.`,
      `ROC-AUC is ${num(chosen.roc_auc, 3)}, against a target of ${num(targets.rocAuc)}. 0.5 is guessing.`,
      `The highest-risk tenth of batches fails at ${share(numberCell(top, "failure_rate"))}, against ${share(testRate)} across all test batches.`,
      `${best ? "Logistic regression ranks best of three models" : "A challenger model ranks better"} on ROC-AUC (random forest ${num(forest.roc_auc, 3)}, gradient boosting ${num(boosting.roc_auc, 3)}).`,
    ],
    meaning: `Use the alerts to order QA review, not to release or reject batches. ${missed.length > 0 ? `It misses the ${missed.join(" and ")} target${missed.length > 1 ? "s" : ""}.` : "It meets every target."}`,
    glossaryKeys: ["recall", "precision", "roc-auc", "logistic-regression", "random-forest", "gradient-boosting", "validation-test"],
  };
}

/** Question 4: what failure chance does a described batch get? */
function predictorQuestion(data: DashboardData): Question {
  const base: Omit<Question, "findings"> = {
    id: "predictor",
    number: 0,
    route: "/predictor",
    pageTitle: "Batch predictor",
    question: "What is the predicted failure chance for a batch with given settings?",
    plainWords: "Describe a batch and see its chance of failing, plus the settings that push the chance up or down.",
    why: "A planner can see the risk of a batch before it runs and which settings to change.",
    method: "Calibrated logistic regression (the same model as the batch alerts)",
    methodPlain: "Scores a batch from its settings, then rescales the score to a chance between 0% and 100%, checked against past outcomes.",
    target: "The predicted chance should match the observed failure rate within each risk group (calibration).",
    meaning: "Gives a plain chance for a batch described by its settings. Use it to see which settings move the risk; it is a triage aid, not a release decision.",
    glossaryKeys: ["calibration", "logistic-regression", "failure-rate", "validation-test"],
  };
  const spec: PredictorSpec | undefined = data.predictor;
  if (!spec) {
    return { ...base, findings: ["The predictor is not in the exported data. Run the export step to add it."] };
  }

  const typical = predict(spec, typicalForm(spec));
  const critical = predict(spec, { ...typicalForm(spec), maintenance: "Critical" });
  const gap = Math.max(...spec.calibration_check.map((row) => Math.abs(row.predicted - row.observed))) * 100;
  const measurements = spec.inputs.numeric.filter((input) => input.name !== "maintenance_due_soon" && input.name !== "maintenance_critical").length;

  return {
    ...base,
    findings: [
      `A typical batch has a predicted failure chance of ${percent(typical.failureChance * 100)}: about ${Math.round(typical.failureChance * 1000)} in 1,000 batches.`,
      `A batch on Critical maintenance has a chance of ${percent(critical.failureChance * 100)}: about ${Math.round(critical.failureChance * 1000)} in 1,000.`,
      `Across ten risk groups, predicted and observed rates differ by at most ${num(gap)} percentage points.`,
      `The base rate for 2024 to 2026 batches is ${percent(spec.base_rate_test * 100)}. Risk levels are compared with this rate.`,
      `The model uses ${formatInteger(measurements)} measurements and three category choices: dosage form, section and maintenance status.`,
    ],
  };
}

/** Question 5: which machines fail more often than expected? */
function equipmentQuestion(data: DashboardData): Question {
  const equipment = tableRows(data, "equipment_reliability");
  const watch = equipment.filter((row) => textCell(row, "priority").startsWith("Watch"));
  const confirmed = equipment.filter((row) => numberCell(row, "ratio_ci_low") > 1);
  const top = rowWithMax(equipment, "standardised_ratio");
  const logit = tableRows(data, "maintenance_logit");
  const critical = logit.find((row) => textCell(row, "term") === "Maintenance: Critical") ?? {};
  const ageTerm = logit.find((row) => textCell(row, "term") === "Equipment age (per year)") ?? {};

  return {
    id: "equipment",
    number: 0,
    route: "/equipment",
    pageTitle: "Equipment health",
    question: "Which machines fail more often than expected?",
    plainWords: "A few machines fail more than their share. Maintenance status and machine age show the clearest links.",
    why: "Repairs and inspections cost money. Finding the machines that need attention first saves time and batches.",
    method: "Observed to expected ratio with exact 95% ranges, and logistic regression for maintenance and age",
    methodPlain: "Compares each machine's actual failures with the number expected from the average rate, and checks whether the gap could be chance.",
    target: "Investigate any machine above a ratio of 1. Count it as confirmed only when its 95% range is above 1.",
    findings: [
      `${formatInteger(watch.length)} of ${formatInteger(equipment.length)} machines are flagged Watch: their failures are above the expected count.`,
      `Highest observed to expected ratio: ${textCell(top, "equipment_name")} at ${num(numberCell(top, "standardised_ratio"))} (${formatInteger(numberCell(top, "failures"))} failures, ${num(numberCell(top, "expected_failures"), 1)} expected).`,
      confirmed.length === 0
        ? "No machine is confirmed above expected, because every 95% range includes 1."
        : `${formatInteger(confirmed.length)} machine${confirmed.length > 1 ? "s are" : " is"} confirmed above expected: the 95% range is entirely above 1.`,
      `Critical maintenance: odds of failure are ${num(numberCell(critical, "odds_ratio"))} times the Current level (95% range ${num(numberCell(critical, "or_ci_low"))} to ${num(numberCell(critical, "or_ci_high"))}).`,
      `Each extra year of equipment age raises the odds of failure by about ${num((numberCell(ageTerm, "odds_ratio") - 1) * 100, 1)}% (95% range ${num((numberCell(ageTerm, "or_ci_low") - 1) * 100, 1)}% to ${num((numberCell(ageTerm, "or_ci_high") - 1) * 100, 1)}%).`,
    ],
    meaning: "Inspect Watch machines first. Confirm the gap with more data before major spending, because the evidence is not yet strong.",
    glossaryKeys: ["observed-expected", "confidence-interval", "odds-ratio", "failure-rate"],
  };
}

/** Question 6: is the process within control and capable? */
function processQuestion(data: DashboardData): Question {
  const capability = tableRows(data, "capability");
  const capable = capability.filter((row) => String(row.capable_at_1_33) === "true");
  const bestSection = rowWithMax(capability, "cpk");
  const weakestSection = rowWithMin(capability, "cpk");
  const totalBatches = sum(capability, "n");
  const weightedOutOfSpec = totalBatches > 0 ? sum(capability.map((row) => ({ value: numberCell(row, "share_out_of_spec") * numberCell(row, "n") })), "value") / totalBatches : Number.NaN;
  const limits = tableRows(data, "within_limits");
  const weakestVariable = rowWithMin(limits, "share_within_limits");
  const outOfControl = sum(limits, "readings_out_of_control");

  return {
    id: "process",
    number: 0,
    route: "/process-control",
    pageTitle: "Process control",
    question: "Are the measured process values stable and within specification?",
    plainWords: "Each reading is checked against its normal range. Each section is checked against its specification.",
    why: "A stable process gives predictable quality, and it is the basis for tighter release limits.",
    method: "Control charts (limits at three standard deviations, 2007 to 2021) and process capability (Cpk)",
    methodPlain: "Tracks each measurement against its normal range, and checks how well each section's output fits its specification.",
    target: `Cpk of ${num(targets.cpk)} or more in every manufacturing section.`,
    findings: [
      `${formatInteger(capable.length)} of ${formatInteger(capability.length)} manufacturing sections reach Cpk ${num(targets.cpk)}.`,
      `Best section: ${textCell(bestSection, "manufacturing_section")} (Cpk ${num(numberCell(bestSection, "cpk"))}). Weakest: ${textCell(weakestSection, "manufacturing_section")} (Cpk ${num(numberCell(weakestSection, "cpk"))}).`,
      `Assay falls outside the 95 to 105% limits for ${share(weightedOutOfSpec, 2)} of batches, weighted by batch count.`,
      `Lowest share of readings within control limits: ${textCell(weakestVariable, "variable").replace(/_/g, " ")} at ${share(numberCell(weakestVariable, "share_within_limits"), 2)}.`,
      `${formatInteger(outOfControl)} readings across the monitored variables fall outside their control limits.`,
    ],
    meaning:
      capable.length === capability.length
        ? "Every section is capable. Keep monitoring the control charts."
        : "Most sections need less variation before tighter limits can be used. Start with the weakest section.",
    glossaryKeys: ["control-limits", "cpk"],
  };
}

/** Question 7: does a discount cap pay off? */
function discountQuestion(data: DashboardData): Question {
  const { discount } = data.summary;
  const response = discount.fitted_to_validation_end ?? discount.full_period;
  const scenarios = tableRows(data, "discount_cap_scenarios");
  const scenario = (key: string): Row => scenarios.find((row) => textCell(row, "assumption") === key) ?? {};
  const none = scenario("none");
  const half = scenario("half");
  const all = scenario("all");
  const margins = tableRows(data, "margin_by_discount");
  const noDiscount = rowWithMin(margins, "Discount_Pct");
  const deepest = rowWithMax(margins, "Discount_Pct");

  return {
    id: "discount",
    number: 0,
    route: "/margin",
    pageTitle: "Margin and discounts",
    question: `Would capping discounts at ${num(discount.cap_pct, 0)}% add profit?`,
    plainWords: "Bigger discounts sell more units but cut margin. A cap protects margin if customers do not buy much less.",
    why: "Discounts are a main lever on margin. A cap that holds volume protects profit without losing customers.",
    method: "Out-of-time test: log-linear volume model fitted on 2014 to 2023, applied to 2024 to 2025 orders",
    methodPlain: "Estimates how much extra volume each discount point brings, then tests a cap on orders that exceed it under three volume assumptions.",
    target: "The cap adds profit under the middle case, where half of the lost volume is recovered.",
    findings: [
      `Each discount point raises units sold by ${num(response.pct_per_point)}% (95% range ${num(response.pct_low)}% to ${num(response.pct_high)}%).`,
      `A ${num(discount.cap_pct, 0)}% cap with no volume loss changes profit by ${kes(numberCell(none, "profit_change_KES"))} over 2024 to 2025.`,
      `If half the lost volume is recovered, the change is ${kes(numberCell(half, "profit_change_KES"))}, keeping ${num(numberCell(half, "volume_retained_pct"), 1)}% of volume.`,
      `If the full volume response is lost, the change is ${kes(numberCell(all, "profit_change_KES"))}, keeping ${num(numberCell(all, "volume_retained_pct"), 1)}% of volume.`,
      `Gross margin falls from ${num(numberCell(noDiscount, "gross_margin_pct"), 1)}% with no discount to ${num(numberCell(deepest, "gross_margin_pct"), 1)}% at a ${num(numberCell(deepest, "Discount_Pct"), 1)}% discount.`,
    ],
    meaning: `The cap helps only if most volume holds. ${numberCell(half, "profit_change_KES") > 0 ? "Pilot it in one branch before a full rollout." : "On current evidence, do not roll it out."}`,
    glossaryKeys: ["discount-response", "confidence-interval", "validation-test"],
  };
}

/** Question 8: can customer credit balances be collected? */
function receivablesQuestion(data: DashboardData): Question {
  const ageing = tableRows(data, "credit_ageing");
  const openShares = tableRows(data, "credit_open_share");
  const credit = data.summary.credit_gate;
  const totalOpen = sum(ageing, "open_balance_KES");
  const shares = openShares.map((row) => numberCell(row, "open_share"));
  const first = openShares[0] ?? {};
  const last = openShares[openShares.length - 1] ?? {};
  const biggest = rowWithMax(ageing, "open_balance_KES");
  const listed = tableRows(data, "credit_top_customers").length;

  return {
    id: "receivables",
    number: 0,
    route: "/receivables",
    pageTitle: "Receivables",
    question: "Can overdue customer balances be identified and collected?",
    plainWords: "We cannot yet confirm who owes what. Until the finance ledger is reconciled, no collection list is produced.",
    why: "Cash that is owed but not collected ties up working capital. A reliable list would help the collection team.",
    method: "Credit balance check: open share by sale year, ageing buckets and a consistency test",
    methodPlain: "Checks whether unpaid credit follows a normal pattern across years. A flat pattern signals that payments are not recorded.",
    target: "Open share falls over time, and the balance check passes.",
    findings: [
      `Open credit balance is ${kes(totalOpen)} across all ageing buckets.`,
      `Open share of credit invoices stays between ${share(Math.min(...shares))} and ${share(Math.max(...shares))} from ${formatInteger(numberCell(first, "year"))} to ${formatInteger(numberCell(last, "year"))}, a spread of ${num(credit.spread_points)} points.`,
      `Latest year (${formatInteger(numberCell(last, "year"))}) open share is ${share(credit.latest_year_open_share)}. Balance check: ${credit.status}.`,
      `Largest ageing bucket: ${textCell(biggest, "bucket")}, with ${kes(numberCell(biggest, "open_balance_KES"))} open.`,
      `${formatInteger(listed)} customers are listed for collection until the finance ledger is reconciled.`,
    ],
    meaning: "Do not chase customers from this data. Reconcile payments with the finance ledger first.",
    glossaryKeys: ["missing-values"],
  };
}

/** Question 9: how much stock is there, and when should it be reordered? */
function inventoryQuestion(data: DashboardData): Question {
  const cancelled = tableRows(data, "cancelled_stock_outflows");
  const opening = tableRows(data, "opening_stock_range");
  const reorder = tableRows(data, "reorder_points");
  const assumptions = data.summary.assumptions;
  const medianReorder = median(reorder.map((row) => numberCell(row, "reorder_point_30d")));

  return {
    id: "inventory",
    number: 0,
    route: "/inventory",
    pageTitle: "Inventory and stock",
    question: "How much stock is on hand, and when should each product be reordered?",
    plainWords: "Stock on hand cannot be checked from these records. Reorder points give a sensible starting point for when to order.",
    why: "Running out loses sales; holding too much ties up cash. Reorder points balance the two.",
    method: "Monthly demand statistics with reorder points (demand over the lead time plus a safety margin)",
    methodPlain: "Uses average daily demand and how much it varies to set the stock level that triggers a new order.",
    target: "Stock on hand verified by a count, and reorder points based on observed demand.",
    findings: [
      `${formatInteger(cancelled.length)} branch and product lines show stock leaving for cancelled orders, worth ${kes(sum(cancelled, "value_KES"))}.`,
      `The file has no opening balances, so opening stock is shown as a range for ${formatInteger(opening.length)} lines.`,
      `Median reorder point at a 30-day lead time: ${formatInteger(medianReorder)} units per line.`,
      `Reorder points cover ${assumptions.lead_times_days.join(", ")} day lead times, with a service factor of z = ${num(assumptions.service_z)} (about 95%).`,
      "Stock on hand cannot be verified from these files. Count stock before acting on a reorder point.",
    ],
    meaning: "Use reorder points as a starting guide. Count stock before acting on them.",
    glossaryKeys: ["reorder-point", "service-level"],
  };
}

/** Question 10: is the demand forecast better than a simple baseline? */
function forecastQuestion(data: DashboardData): Question {
  const forecast = data.summary.forecast;
  const holdout = tableRows(data, "forecast_holdout");
  const ranked = [...holdout].sort((first, second) => numberCell(first, "wape_pct") - numberCell(second, "wape_pct"));
  const chosen = holdout.find((row) => textCell(row, "method") === forecast.chosen_method) ?? {};
  const seasonal = holdout.find((row) => textCell(row, "method") === "Seasonal naive") ?? {};
  const best = ranked[0] ?? {};
  const rank = ranked.findIndex((row) => textCell(row, "method") === forecast.chosen_method) + 1;

  return {
    id: "forecast",
    number: 0,
    route: "/inventory",
    pageTitle: "Inventory and stock",
    question: "Can demand be forecast better than a simple baseline?",
    plainWords: "The forecast predicts monthly demand for each branch and product. It is tested on a year it has not seen.",
    why: "Better demand forecasts reduce both stock-outs and excess stock.",
    method: "Mean of last 12 months, damped Holt-Winters and seasonal naive, compared on forecast error",
    methodPlain: "Each method predicts the next months from past sales. The method with the lowest error on the selection year is used.",
    target: `At least ${num(targets.forecastGainPct, 0)}% lower error than seasonal naive on the ${forecast.holdout_year} holdout.`,
    findings: [
      `Chosen on ${forecast.selection_year} data: ${forecast.chosen_method}. On ${forecast.holdout_year} it beats seasonal naive by ${num(forecast.improvement_vs_seasonal_naive_pct, 1)}%, against a target of ${num(targets.forecastGainPct, 0)}%.`,
      `Lowest error on ${forecast.holdout_year}: ${textCell(best, "method")} (WAPE ${num(numberCell(best, "wape_pct"), 1)}%). The chosen method ranks ${formatInteger(rank)} of ${formatInteger(ranked.length)}.`,
      `Error on ${forecast.holdout_year}: chosen method WAPE ${num(numberCell(chosen, "wape_pct"), 1)}%, seasonal naive WAPE ${num(numberCell(seasonal, "wape_pct"), 1)}%.`,
      `The forecast covers ${formatInteger(forecast.series_count)} branch and product series.`,
      `Average bias for the chosen method on ${forecast.holdout_year}: ${num(numberCell(chosen, "bias_pct"), 1)}% (positive means the forecast ran high).`,
    ],
    meaning: `The chosen method meets the gain target. ${rank === 1 ? "It also has the lowest error on the holdout year." : `A different method had lower error in ${forecast.holdout_year}, so repeat the method choice each year.`}`,
    glossaryKeys: ["wape", "seasonal-naive", "holdout-year"],
  };
}

/** Question 11: how fast are costs rising, and are suppliers concentrated or charging premiums? */
function costQuestion(data: DashboardData): Question {
  const cost = data.summary.cost_trend;
  const spread = data.summary.product_year_spread;
  const premiums = tableRows(data, "supplier_premium");
  const aboveReference = premiums.filter((row) => numberCell(row, "premium_pct") > 0).length;
  const concentration = tableRows(data, "supplier_concentration");
  const latest = concentration.reduce((best, row) => (numberCell(row, "year") > numberCell(best, "year") ? row : best), concentration[0] ?? {});

  return {
    id: "costs",
    number: 0,
    route: "/costs",
    pageTitle: "Cost and suppliers",
    question: "How fast are costs rising, and do a few suppliers dominate or charge premiums?",
    plainWords: "Supplier prices keep rising slowly. Spending is spread across many suppliers, and none charges a clear premium.",
    why: "Cost growth sets the budget and the price list. Supplier concentration is a supply risk.",
    method: "Trend in receipt prices, supplier premium check and the Herfindahl index (HHI) for concentration",
    methodPlain: "Measures how fast costs rise each year, and how much of the spend sits with a few suppliers.",
    target: `HHI below ${formatInteger(targets.hhiThreshold)}, and no supplier charging above the reference price.`,
    findings: [
      `Supplier receipt prices rise ${num(cost.growth_pct_per_year)}% a year (95% range ${num(cost.low_pct)}% to ${num(cost.high_pct)}%).`,
      `${formatInteger(aboveReference)} of ${formatInteger(premiums.length)} suppliers charge above the reference price.`,
      `${formatInteger(spread.with_more_than_one_cost)} of ${formatInteger(spread.product_years)} product-years show more than one cost.`,
      `Supplier concentration in ${formatInteger(numberCell(latest, "year"))}: HHI ${formatInteger(numberCell(latest, "hhi"))}, ${textCell(latest, "label")}. Threshold ${formatInteger(targets.hhiThreshold)}.`,
      `Largest single supplier share in ${formatInteger(numberCell(latest, "year"))}: ${num(numberCell(latest, "top_share_pct"), 1)}% (${textCell(latest, "top_supplier")}).`,
    ],
    meaning: `Costs rise about ${num(cost.growth_pct_per_year, 1)}% a year. ${aboveReference === 0 ? "No supplier charges a premium over the reference price" : `${formatInteger(aboveReference)} suppliers charge a premium`}, so plan budgets for the general trend.`,
    glossaryKeys: ["hhi"],
  };
}

/** Builds the list of questions, in the order they appear in the master table. */
export function buildQuestions(data: DashboardData): Question[] {
  const built = [
    dataQuality(data),
    factorQuestion(data),
    classifierQuestion(data),
    predictorQuestion(data),
    equipmentQuestion(data),
    processQuestion(data),
    discountQuestion(data),
    receivablesQuestion(data),
    inventoryQuestion(data),
    forecastQuestion(data),
    costQuestion(data),
  ];
  return built.map((question, index) => ({ ...question, number: index + 1 }));
}

/** Returns the questions that belong to one page route. */
export function questionsForRoute(questions: Question[], route: string): Question[] {
  return questions.filter((question) => question.route === route);
}

/** One row of the master summary table. Its key result and meaning are the same text the question panels show. */
export function masterRow(question: Question): Row {
  return {
    "No.": question.number,
    "Question / Problem": question.question,
    "Model / Method": question.method,
    Target: question.target,
    "Key Result": question.findings[0] ?? "",
    "What It Means": question.meaning,
  };
}

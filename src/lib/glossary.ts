/** Plain-English definitions for the terms used on the dashboard. Shown in each "What is this?" box. */
export interface GlossaryEntry {
  term: string;
  meaning: string;
}

export const glossary: Record<string, GlossaryEntry> = {
  "failure-rate": {
    term: "Failure rate",
    meaning: "The share of batches that failed quality checks. For example, 3 failures in 100 batches is a 3% failure rate.",
  },
  recall: {
    term: "Recall",
    meaning: "The share of real failures that the alerts catch. A recall of 82% means 82 of every 100 failing batches are flagged.",
  },
  precision: {
    term: "Precision",
    meaning: "The share of flagged batches that really fail. Low precision means many flags are false alarms.",
  },
  "roc-auc": {
    term: "ROC-AUC",
    meaning: "A score from 0 to 1 for how well a model ranks failing batches above passing ones. 0.5 is no better than guessing, and 1.0 is perfect.",
  },
  "logistic-regression": {
    term: "Logistic regression",
    meaning: "A model that adds up weighted inputs into one score, then turns the score into a chance between 0% and 100%. Its weights are easy to read.",
  },
  "random-forest": {
    term: "Random forest",
    meaning: "A model made of many decision trees that vote together. It can capture complex patterns but is harder to explain.",
  },
  "gradient-boosting": {
    term: "Gradient boosting (XGBoost)",
    meaning: "A model that builds many small trees one after another, each correcting the errors of the last. Powerful, but it can overfit.",
  },
  calibration: {
    term: "Calibration",
    meaning: "Whether a predicted chance matches what happens in practice. If batches scored at 3% fail about 3 times in 100, the model is well calibrated.",
  },
  "validation-test": {
    term: "Validation and test data",
    meaning: "Validation data (2022 to 2023) is used to choose settings. Test data (2024 to 2026) is used once, to report the final result fairly.",
  },
  "confidence-interval": {
    term: "95% range",
    meaning: "A range that would contain the true value in 95 of 100 repeated samples. A narrow range means a precise estimate.",
  },
  "p-value": {
    term: "p-value",
    meaning: "The chance of seeing a link this strong if no real link existed. Below 0.05 is the usual cut-off for calling a link real.",
  },
  "chi-square": {
    term: "Chi-square test",
    meaning: "A test that checks whether two categories are linked, such as dosage form and failure, or whether the gap could be chance.",
  },
  "odds-ratio": {
    term: "Odds ratio",
    meaning: "How much the odds of failure change. 2.0 means double the odds; 1.0 means no change.",
  },
  "observed-expected": {
    term: "Observed to expected ratio",
    meaning: "Actual failures divided by the failures expected from the average rate. Above 1 means more failures than expected.",
  },
  "control-limits": {
    term: "Control limits",
    meaning: "The normal range of a measurement, set at three standard deviations from the average. A reading outside them is a signal to investigate.",
  },
  cpk: {
    term: "Cpk (process capability)",
    meaning: "How well a process fits inside its specification limits. A value of 1.33 or more is the usual target.",
  },
  hhi: {
    term: "HHI (concentration index)",
    meaning: "A score from 0 to 10,000 for how much of spending sits with a few suppliers. Above 1,500 means concentrated.",
  },
  wape: {
    term: "WAPE (forecast error)",
    meaning: "Total forecast error as a share of total actual demand. Lower is better.",
  },
  "seasonal-naive": {
    term: "Seasonal naive",
    meaning: "A simple forecast that repeats the same month from the previous year. It is the baseline any forecast must beat.",
  },
  "holdout-year": {
    term: "Holdout year",
    meaning: "A year kept back until the forecasting method is fixed, so the final check is fair.",
  },
  "discount-response": {
    term: "Discount response",
    meaning: "The percentage rise in units sold for each one-point increase in discount, estimated after allowing for product, branch and year.",
  },
  "reorder-point": {
    term: "Reorder point",
    meaning: "The stock level at which a new order should be placed. It covers demand during the supplier's lead time plus a safety margin.",
  },
  "service-level": {
    term: "Service level",
    meaning: "The chance of having enough stock during a lead time. The dashboard uses about 95%, which is z = 1.65 in the model.",
  },
  "risk-score": {
    term: "Risk score",
    meaning: "A combined score from quality, equipment and process signals. The High tier is the top 10% of validation batches.",
  },
  "missing-values": {
    term: "Missing values",
    meaning: "Cells with no recorded value. A column with many missing values can bias results if it is not handled.",
  },
  "correlation": {
    term: "Correlation",
    meaning: "How closely two measurements move together, from -1 to 1. Near 0 means little linear link; near 1 or -1 means a strong link.",
  },
};

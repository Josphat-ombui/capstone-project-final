import { describe, expect, it } from "vitest";
import { predict, typicalForm, type PredictorSpec } from "../predictor";
import dashboard from "../../../public/data/dashboard.json";

const spec = (dashboard as unknown as { predictor: PredictorSpec }).predictor;

describe("batch predictor", () => {
  it("predicts a typical batch close to the test-period base rate", () => {
    const typical = predict(spec, typicalForm(spec));
    expect(typical.failureChance).toBeGreaterThan(0.01);
    expect(typical.failureChance).toBeLessThan(0.06);
    expect(typical.successRate + typical.failureChance).toBeCloseTo(1, 10);
  });

  it("moves risk in the direction of the fitted coefficient", () => {
    const base = typicalForm(spec);
    const higherVariance = { ...base, numeric: { ...base.numeric, temp_variance: base.numeric.temp_variance + 0.3 } };
    const before = predict(spec, base).failureChance;
    const after = predict(spec, higherVariance).failureChance;
    expect(after).toBeGreaterThan(before);
  });

  it("explains the prediction with factors that carry the sign of their effect", () => {
    const base = typicalForm(spec);
    const critical = { ...base, maintenance: "Critical" };
    const result = predict(spec, critical);
    const maintenance = result.factors.find((factor) => factor.label === "Maintenance: Critical");
    expect(maintenance).toBeDefined();
    expect(maintenance!.effect).toBeGreaterThan(0);
    expect(result.factors.every((factor, index, all) => index === 0 || Math.abs(all[index - 1].effect) >= Math.abs(factor.effect))).toBe(true);
  });

  it("flags values outside the training range", () => {
    const base = typicalForm(spec);
    const extreme = { ...base, numeric: { ...base.numeric, temp_avg: 40 } };
    expect(predict(spec, extreme).outsideRange).toContain("Average temperature");
  });
});

import { describe, expect, it } from "vitest";
import { wilsonInterval } from "../stats";

describe("Wilson interval", () => {
  it("matches the pipeline's interval for the Current maintenance group", () => {
    // Reference values from reports/tables/failure_rates.csv (1,687 failures in 54,240 batches).
    const [low, high] = wilsonInterval(1687, 54240);
    expect(low).toBeCloseTo(0.02967, 4);
    expect(high).toBeCloseTo(0.03260, 4);
  });

  it("stays inside 0 and 1 when there are no failures", () => {
    const [low, high] = wilsonInterval(0, 20);
    expect(low).toBe(0);
    expect(high).toBeGreaterThan(0);
    expect(high).toBeLessThan(1);
  });

  it("returns NaN when the group is empty", () => {
    const [low, high] = wilsonInterval(0, 0);
    expect(low).toBeNaN();
    expect(high).toBeNaN();
  });
});

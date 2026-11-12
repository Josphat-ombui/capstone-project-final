import { describe, expect, it } from "vitest";
import { formatDate, formatFraction, formatKesMillions, formatPercent } from "../format";

describe("number formatting", () => {
  it("shows a loss with a leading minus in millions", () => {
    expect(formatKesMillions(-51_820_000)).toBe("-KES 51.8 m");
  });

  it("converts a fraction to a percentage", () => {
    expect(formatFraction(0.819, 1)).toBe("81.9%");
  });

  it("formats an already-percent value", () => {
    expect(formatPercent(3.12, 2)).toBe("3.12%");
  });

  it("shows a dash for values that are not numbers", () => {
    expect(formatPercent(Number.NaN)).toBe("-");
  });

  it("converts ISO dates to day-month-year", () => {
    expect(formatDate("2025-01-01")).toBe("01/01/2025");
  });
});

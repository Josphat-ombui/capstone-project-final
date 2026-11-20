import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  defaultFilters,
  describeFilters,
  failureByLevel,
  failureByYear,
  failureTotals,
  isFiltered,
  passesBatch,
  passesBranch,
  toggleValue,
  yearInRange,
  type Filters,
} from "../filters";
import type { Row } from "../data";

/** Three monthly rows covering two sections, two dosage forms and two years. */
const monthly: Row[] = [
  { year: 2020, manufacturing_section: "Oral Solids", dosage_form: "Tablet", maintenance_status: "Current", age_band: "0-2 yrs", operator_band: "0-2 yrs", batches: 100, failures: 3 },
  { year: 2020, manufacturing_section: "Oral Solids", dosage_form: "Capsule", maintenance_status: "Critical", age_band: "10+ yrs", operator_band: "11+ yrs", batches: 50, failures: 5 },
  { year: 2024, manufacturing_section: "Injectables", dosage_form: "Injection", maintenance_status: "Current", age_band: "2-5 yrs", operator_band: "3-5 yrs", batches: 40, failures: 4 },
];

const withFilters = (patch: Partial<Filters>): Filters => ({ ...defaultFilters, ...patch });

describe("filter state", () => {
  it("treats the default selection as unfiltered", () => {
    expect(isFiltered(defaultFilters)).toBe(false);
    expect(activeFilterCount(defaultFilters)).toBe(0);
    expect(describeFilters(defaultFilters)).toBe("no filters");
  });

  it("counts each restricted dimension and the year range once", () => {
    expect(activeFilterCount(withFilters({ sections: ["Oral Solids"], dosages: ["Tablet", "Capsule"] }))).toBe(2);
    expect(activeFilterCount(withFilters({ fromYear: 2015, toYear: 2026 }))).toBe(1);
  });

  it("describes the active filters in plain words", () => {
    const text = describeFilters(withFilters({ sections: ["Oral Solids"], fromYear: 2015, toYear: 2020 }));
    expect(text).toBe("section Oral Solids, production years 2015 to 2020");
  });

  it("joins several values in one dimension with 'or'", () => {
    expect(describeFilters(withFilters({ dosages: ["Bolus", "Injection"] }))).toBe("dosage form Bolus or Injection");
  });

  it("checks year membership at both ends of the range", () => {
    const filters = withFilters({ fromYear: 2015, toYear: 2020 });
    expect(yearInRange(2015, filters)).toBe(true);
    expect(yearInRange(2020, filters)).toBe(true);
    expect(yearInRange(2021, filters)).toBe(false);
  });

  it("adds and removes a value when toggled", () => {
    expect(toggleValue([], "Critical")).toEqual(["Critical"]);
    expect(toggleValue(["Critical", "Current"], "Critical")).toEqual(["Current"]);
  });
});

describe("failure totals", () => {
  it("sums every row when unfiltered", () => {
    const totals = failureTotals(monthly, defaultFilters);
    expect(totals.batches).toBe(190);
    expect(totals.failures).toBe(12);
    expect(totals.rate).toBeCloseTo(12 / 190, 10);
  });

  it("restricts to one section", () => {
    const totals = failureTotals(monthly, withFilters({ sections: ["Oral Solids"] }));
    expect(totals.batches).toBe(150);
    expect(totals.failures).toBe(8);
  });

  it("combines several values in one dimension", () => {
    const totals = failureTotals(monthly, withFilters({ dosages: ["Tablet", "Injection"] }));
    expect(totals.batches).toBe(140);
    expect(totals.failures).toBe(7);
  });

  it("combines different dimensions with AND", () => {
    const totals = failureTotals(monthly, withFilters({ sections: ["Oral Solids"], maintenance: ["Critical"] }));
    expect(totals.batches).toBe(50);
    expect(totals.failures).toBe(5);
  });

  it("restricts to a production year range", () => {
    const totals = failureTotals(monthly, withFilters({ fromYear: 2021, toYear: 2026 }));
    expect(totals.batches).toBe(40);
    expect(totals.failures).toBe(4);
  });

  it("returns NaN for a rate when nothing matches", () => {
    expect(failureTotals(monthly, withFilters({ sections: ["Creams & Ointments"] })).rate).toBeNaN();
  });
});

describe("breakdowns by level", () => {
  it("keeps every dosage level when the dosage filter is on that same dimension", () => {
    const levels = failureByLevel(monthly, withFilters({ dosages: ["Tablet"] }), "dosage_form");
    expect(levels.map((level) => level.level)).toEqual(["Capsule", "Injection", "Tablet"]);
  });

  it("applies the section filter to a dosage breakdown", () => {
    const levels = failureByLevel(monthly, withFilters({ sections: ["Oral Solids"] }), "dosage_form");
    expect(levels.map((level) => level.level)).toEqual(["Capsule", "Tablet"]);
  });

  it("computes the rate for each maintenance level", () => {
    const levels = failureByLevel(monthly, defaultFilters, "maintenance_status");
    expect(levels.find((level) => level.level === "Critical")?.rate).toBeCloseTo(0.1, 10);
    expect(levels.find((level) => level.level === "Current")?.batches).toBe(140);
  });

  it("applies the age and operator filters to the other breakdowns", () => {
    const levels = failureByLevel(monthly, withFilters({ ageBands: ["10+ yrs"] }), "operator_band");
    expect(levels).toEqual([expect.objectContaining({ level: "11+ yrs", batches: 50, failures: 5 })]);
  });
});

describe("yearly trend and batch-level checks", () => {
  it("returns the failure rate for each year in order", () => {
    const years = failureByYear(monthly, defaultFilters);
    expect(years.map((year) => year.year)).toEqual([2020, 2024]);
    expect(years[0].rate).toBeCloseTo(8 / 150, 10);
  });

  it("checks a single batch against section, dosage and year", () => {
    const filters = withFilters({ sections: ["Oral Solids"], dosages: ["Tablet"], fromYear: 2019, toYear: 2021 });
    expect(passesBatch("Oral Solids", "Tablet", 2020, filters)).toBe(true);
    expect(passesBatch("Injectables", "Tablet", 2020, filters)).toBe(false);
    expect(passesBatch("Oral Solids", "Capsule", 2020, filters)).toBe(false);
    expect(passesBatch("Oral Solids", "Tablet", 2024, filters)).toBe(false);
  });

  it("lets every branch through when none is selected", () => {
    expect(passesBranch("BR02", defaultFilters)).toBe(true);
    expect(passesBranch("BR02", withFilters({ branches: ["BR01"] }))).toBe(false);
  });
});

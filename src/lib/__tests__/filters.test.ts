import { describe, expect, it } from "vitest";
import { ALL, defaultFilters, describeFilters, failureByLevel, failureTotals, isFiltered, yearInRange, type Filters } from "../filters";
import type { Row } from "../data";

/** Three monthly rows covering two sections, two dosage forms and two years. */
const monthly: Row[] = [
  { year: 2020, manufacturing_section: "Oral Solids", dosage_form: "Tablet", maintenance_status: "Current", batches: 100, failures: 3 },
  { year: 2020, manufacturing_section: "Oral Solids", dosage_form: "Capsule", maintenance_status: "Critical", batches: 50, failures: 5 },
  { year: 2024, manufacturing_section: "Injectables", dosage_form: "Injection", maintenance_status: "Current", batches: 40, failures: 4 },
];

const withFilters = (patch: Partial<Filters>): Filters => ({ ...defaultFilters, ...patch });

describe("filter state", () => {
  it("treats the default selection as unfiltered", () => {
    expect(isFiltered(defaultFilters)).toBe(false);
    expect(describeFilters(defaultFilters)).toBe("no filters");
  });

  it("detects each kind of restriction", () => {
    expect(isFiltered(withFilters({ section: "Oral Solids" }))).toBe(true);
    expect(isFiltered(withFilters({ dosage: "Tablet" }))).toBe(true);
    expect(isFiltered(withFilters({ fromYear: 2010 }))).toBe(true);
    expect(isFiltered(withFilters({ toYear: 2020 }))).toBe(true);
  });

  it("describes the active filters in plain words", () => {
    const text = describeFilters(withFilters({ section: "Oral Solids", fromYear: 2015, toYear: 2020 }));
    expect(text).toBe("section Oral Solids, production years 2015 to 2020");
  });

  it("checks year membership at both ends of the range", () => {
    const filters = withFilters({ fromYear: 2015, toYear: 2020 });
    expect(yearInRange(2015, filters)).toBe(true);
    expect(yearInRange(2020, filters)).toBe(true);
    expect(yearInRange(2021, filters)).toBe(false);
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
    const totals = failureTotals(monthly, withFilters({ section: "Oral Solids" }));
    expect(totals.batches).toBe(150);
    expect(totals.failures).toBe(8);
  });

  it("restricts to a production year range", () => {
    const totals = failureTotals(monthly, withFilters({ fromYear: 2021, toYear: 2026 }));
    expect(totals.batches).toBe(40);
    expect(totals.failures).toBe(4);
  });

  it("returns NaN for a rate when nothing matches", () => {
    expect(failureTotals(monthly, withFilters({ section: "Creams & Ointments" })).rate).toBeNaN();
  });
});

describe("breakdowns by level", () => {
  it("keeps every dosage level when the dosage filter is on that same column", () => {
    const levels = failureByLevel(monthly, withFilters({ dosage: "Tablet" }), "dosage_form");
    expect(levels.map((level) => level.level)).toEqual(["Capsule", "Injection", "Tablet"]);
  });

  it("applies the section filter to a dosage breakdown", () => {
    const levels = failureByLevel(monthly, withFilters({ section: "Oral Solids" }), "dosage_form");
    expect(levels.map((level) => level.level)).toEqual(["Capsule", "Tablet"]);
  });

  it("computes the rate for each maintenance level", () => {
    const levels = failureByLevel(monthly, defaultFilters, "maintenance_status");
    const critical = levels.find((level) => level.level === "Critical");
    expect(critical?.rate).toBeCloseTo(0.1, 10);
    expect(levels.find((level) => level.level === "Current")?.batches).toBe(140);
  });

  it("uses the ALL sentinel for an unrestricted section", () => {
    expect(ALL).toBe("All");
    expect(failureByLevel(monthly, withFilters({ section: ALL }), "manufacturing_section")).toHaveLength(2);
  });
});

describe("age and operator breakdowns", () => {
  const banded: Row[] = [
    { year: 2024, manufacturing_section: "Oral Solids", dosage_form: "Tablet", age_band: "0-2 years", operator_band: "<1 year", batches: 10, failures: 1 },
    { year: 2024, manufacturing_section: "Oral Solids", dosage_form: "Tablet", age_band: "10+ years", operator_band: "5-10 years", batches: 20, failures: 4 },
    { year: 2025, manufacturing_section: "Injectables", dosage_form: "Bolus", age_band: "0-2 years", operator_band: "<1 year", batches: 30, failures: 3 },
  ];

  it("breaks failures down by age band and respects the section filter", () => {
    const levels = failureByLevel(banded, withFilters({ section: "Oral Solids" }), "age_band");
    expect(levels.map((level) => level.level)).toEqual(["0-2 years", "10+ years"]);
    expect(levels.find((level) => level.level === "10+ years")?.rate).toBeCloseTo(0.2);
  });

  it("applies the year range to operator bands", () => {
    const levels = failureByLevel(banded, withFilters({ fromYear: 2025, toYear: 2025 }), "operator_band");
    expect(levels).toEqual([expect.objectContaining({ level: "<1 year", batches: 30, failures: 3 })]);
  });
});

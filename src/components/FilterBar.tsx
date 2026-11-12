import { RotateCcw } from "lucide-react";
import { ALL, YEAR_RANGE, defaultFilters, isFiltered, type Filters } from "../lib/filters";
import { useFilters } from "./FilterContext";

/** The global filter strip shown under the top bar on every page. */
export function FilterBar() {
  const { filters, setFilters, options } = useFilters();
  const years = Array.from({ length: YEAR_RANGE.max - YEAR_RANGE.min + 1 }, (_, index) => YEAR_RANGE.min + index);

  /** Changes one filter and keeps the year range in order. */
  function update(patch: Partial<Filters>) {
    const next = { ...filters, ...patch };
    if (next.fromYear > next.toYear) {
      if (patch.fromYear !== undefined) next.toYear = next.fromYear;
      else next.fromYear = next.toYear;
    }
    setFilters(next);
  }

  return (
    <div className="filter-bar" role="search" aria-label="Dashboard filters">
      <label className="filter-field">
        <span>Section</span>
        <select value={filters.section} onChange={(event) => update({ section: event.target.value })}>
          <option value={ALL}>All sections</option>
          {options.sections.map((section) => (
            <option key={section} value={section}>
              {section}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-field">
        <span>Dosage form</span>
        <select value={filters.dosage} onChange={(event) => update({ dosage: event.target.value })}>
          <option value={ALL}>All dosage forms</option>
          {options.dosageForms.map((dosage) => (
            <option key={dosage} value={dosage}>
              {dosage}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-field">
        <span>From year</span>
        <select value={filters.fromYear} onChange={(event) => update({ fromYear: Number(event.target.value) })}>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
      <label className="filter-field">
        <span>To year</span>
        <select value={filters.toYear} onChange={(event) => update({ toYear: Number(event.target.value) })}>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>
      <button type="button" className="btn btn-ghost filter-reset" onClick={() => setFilters(defaultFilters)} disabled={!isFiltered(filters)}>
        <RotateCcw size={14} aria-hidden="true" /> Reset
      </button>
    </div>
  );
}

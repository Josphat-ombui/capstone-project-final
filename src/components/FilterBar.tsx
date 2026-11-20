import { RotateCcw, SlidersHorizontal, X } from "lucide-react";
import {
  BATCH_DIMENSIONS,
  DIMENSION_LABELS,
  YEAR_RANGE,
  activeFilterCount,
  defaultFilters,
  describeFilters,
  isFiltered,
  toggleValue,
  valuesOf,
  yearRestricted,
  type Dimension,
  type Filters,
  type FilterOptions,
} from "../lib/filters";
import { useFilters } from "./FilterContext";

/** Quick selections that answer the questions most people ask first. */
const PRESETS: { label: string; patch: Partial<Filters> }[] = [
  { label: "Critical maintenance", patch: { maintenance: ["Critical"] } },
  { label: "Bolus and injection", patch: { dosages: ["Bolus", "Injection"] } },
  { label: "Oral solids", patch: { sections: ["Oral Solids"] } },
  { label: "Older equipment (10+ years)", patch: { ageBands: ["10+ yrs"] } },
  { label: "Experienced operators (11+ years)", patch: { operatorBands: ["11+ yrs"] } },
  { label: "Last five years", patch: { fromYear: 2022, toYear: 2026 } },
];

/** The options each dimension offers, keyed by the dimension name. */
function optionsFor(options: FilterOptions, dimension: Dimension): string[] {
  return options[dimension];
}

/** The global filter panel shown on every page that responds to filters. */
export function FilterBar({ mode = "batch" }: { mode?: "batch" | "branch" }) {
  const { filters, setFilters, options } = useFilters();
  const branchOnly = mode === "branch";
  const count = branchOnly ? filters.branches.length : activeFilterCount(filters);
  const dimensions: Dimension[] = branchOnly ? ["branches"] : BATCH_DIMENSIONS;

  /** Replaces part of the selection and keeps the year range in order. */
  function update(patch: Partial<Filters>) {
    const next = { ...filters, ...patch };
    if (next.fromYear > next.toYear) {
      if (patch.fromYear !== undefined) next.toYear = next.fromYear;
      else next.fromYear = next.toYear;
    }
    setFilters(next);
  }

  /** Toggles one value in a list dimension. */
  function toggle(dimension: Dimension, value: string) {
    update({ [dimension]: toggleValue(valuesOf(filters, dimension), value) } as Partial<Filters>);
  }

  /** Removes one active value, from a chip. */
  function remove(dimension: Dimension, value: string) {
    update({ [dimension]: valuesOf(filters, dimension).filter((item) => item !== value) } as Partial<Filters>);
  }

  const years = YEAR_RANGE.max - YEAR_RANGE.min;
  const activeChips = dimensions.flatMap((dimension) => valuesOf(filters, dimension).map((value) => ({ dimension, value })));

  return (
    <div className="filter-panel" role="search" aria-label="Dashboard filters">
      <div className="filter-panel-head">
        <div className="filter-title">
          <SlidersHorizontal size={18} aria-hidden="true" />
          <div>
            <p className="filter-heading">Filter the dashboard</p>
            <p className="filter-summary">
              {branchOnly
                ? count === 0 ? "Showing all branches" : `Branch ${filters.branches.join(" or ")}`
                : count === 0 ? "Showing all batches, 2007 to 2026" : `${count} active: ${describeFilters(filters)}`}
            </p>
          </div>
        </div>
        <button type="button" className="btn btn-ghost filter-reset" onClick={() => setFilters(branchOnly ? { ...filters, branches: [] } : defaultFilters)} disabled={branchOnly ? count === 0 : !isFiltered(filters)}>
          <RotateCcw size={14} aria-hidden="true" /> Reset all
        </button>
      </div>

      {!branchOnly && (
      <div className="preset-chips" aria-label="Quick selections">
        {PRESETS.map((preset) => (
          <button key={preset.label} type="button" className="preset-chip" onClick={() => setFilters({ ...defaultFilters, ...preset.patch })}>
            {preset.label}
          </button>
        ))}
      </div>
      )}

      <div className="filter-groups">
        {dimensions.map((dimension) => (
          <fieldset className="filter-group" key={dimension}>
            <legend>{DIMENSION_LABELS[dimension]}</legend>
            <div className="chip-row">
              {optionsFor(options, dimension).map((value) => {
                const pressed = valuesOf(filters, dimension).includes(value);
                return (
                  <button key={value} type="button" className="chip" aria-pressed={pressed} onClick={() => toggle(dimension, value)}>
                    {value}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}

        {!branchOnly && (
        <fieldset className="filter-group filter-group-years">
          <legend>
            Production years <span className="range-readout">{filters.fromYear} to {filters.toYear}</span>
          </legend>
          <div className="range-pair">
            <label className="range-field">
              <span>From</span>
              <input
                type="range"
                min={YEAR_RANGE.min}
                max={YEAR_RANGE.max}
                step={1}
                value={filters.fromYear}
                aria-label="From year"
                onChange={(event) => update({ fromYear: Number(event.target.value) })}
              />
            </label>
            <label className="range-field">
              <span>To</span>
              <input
                type="range"
                min={YEAR_RANGE.min}
                max={YEAR_RANGE.max}
                step={1}
                value={filters.toYear}
                aria-label="To year"
                onChange={(event) => update({ toYear: Number(event.target.value) })}
              />
            </label>
          </div>
          <p className="range-hint">{yearRestricted(filters) ? "Year range active" : `All ${years + 1} years`}</p>
        </fieldset>
        )}
      </div>

      {activeChips.length > 0 && (
        <div className="active-chips" aria-label="Active selections">
          {activeChips.map(({ dimension, value }) => (
            <span key={`${dimension}-${value}`} className="active-chip">
              <span className="active-chip-label">{DIMENSION_LABELS[dimension]}: {value}</span>
              <button type="button" aria-label={`Remove ${DIMENSION_LABELS[dimension]} ${value}`} onClick={() => remove(dimension, value)}>
                <X size={13} aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { defaultFilters, type FilterOptions, type Filters } from "../lib/filters";

interface FilterState {
  filters: Filters;
  setFilters: (next: Filters) => void;
  options: FilterOptions;
}

const FilterContext = createContext<FilterState | null>(null);

/** Holds the dashboard-wide filters so every page reads the same selection. */
export function FilterProvider({ options, children }: { options: FilterOptions; children: ReactNode }) {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const value = useMemo(() => ({ filters, setFilters, options }), [filters, options]);
  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

/** Reads the current filters and the options they choose from. */
export function useFilters(): FilterState {
  const state = useContext(FilterContext);
  if (!state) {
    throw new Error("useFilters must be used inside FilterProvider.");
  }
  return state;
}

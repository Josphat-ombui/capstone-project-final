import { useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, Download, Search } from "lucide-react";
import type { Cell, Row } from "../lib/data";
import { downloadCsv } from "../lib/csv";

export interface ColumnSpec {
  key: string;
  label: string;
  /** Turns a raw cell into display text. Defaults to the raw value. */
  format?: (value: Cell, row: Row) => string;
  align?: "left" | "right";
  /** Keep the cell on one line, for dates and codes. */
  nowrap?: boolean;
}

interface DataTableProps {
  rows: Row[];
  columns: ColumnSpec[];
  fileName: string;
  pageSize?: number;
  /** Columns searched by the text box. Defaults to every column. */
  searchKeys?: string[];
  /** Optional cell renderer for tone (for example a coloured pill). */
  renderCell?: (column: ColumnSpec, row: Row) => ReactNode | undefined;
  emptyMessage?: string;
}

type SortState = { key: string; direction: "asc" | "desc" } | null;

/** Compares two cells for sorting. Numbers sort numerically; everything else sorts as text. */
function compareCells(first: Cell, second: Cell): number {
  if (first === null && second === null) return 0;
  if (first === null) return 1;
  if (second === null) return -1;
  if (typeof first === "number" && typeof second === "number") return first - second;
  return String(first).localeCompare(String(second), undefined, { numeric: true });
}

/** A table with search, sorting, paging and a CSV download of the full table. */
export function DataTable({
  rows,
  columns,
  fileName,
  pageSize = 10,
  searchKeys,
  renderCell,
  emptyMessage = "No rows to show.",
}: DataTableProps) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortState>(null);
  const [page, setPage] = useState(0);

  const keysToSearch = searchKeys ?? columns.map((column) => column.key);

  const filteredRows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matching = needle
      ? rows.filter((row) => keysToSearch.some((key) => String(row[key] ?? "").toLowerCase().includes(needle)))
      : rows;
    if (!sort) return matching;
    const direction = sort.direction === "asc" ? 1 : -1;
    return [...matching].sort((first, second) => direction * compareCells(first[sort.key] ?? null, second[sort.key] ?? null));
  }, [rows, query, sort]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, pageCount - 1);
  const visibleRows = filteredRows.slice(currentPage * pageSize, currentPage * pageSize + pageSize);

  /** Cycles a column through ascending, descending and unsorted. */
  function toggleSort(key: string) {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: "asc" };
      if (current.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  }

  function sortIcon(key: string) {
    if (!sort || sort.key !== key) return <ArrowUpDown size={13} aria-hidden="true" />;
    return sort.direction === "asc" ? <ArrowUp size={13} aria-hidden="true" /> : <ArrowDown size={13} aria-hidden="true" />;
  }

  return (
    <div className="table-wrap">
      <div className="table-toolbar">
        <label className="search-box">
          <Search size={15} aria-hidden="true" />
          <span className="visually-hidden">Search table</span>
          <input
            type="search"
            placeholder="Search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setPage(0);
            }}
          />
        </label>
        <span className="table-count">
          {filteredRows.length.toLocaleString("en-KE")} of {rows.length.toLocaleString("en-KE")} rows
        </span>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => downloadCsv(fileName, filteredRows, columns.map((column) => column.key))}
          disabled={filteredRows.length === 0}
        >
          <Download size={15} aria-hidden="true" /> CSV
        </button>
      </div>

      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key} className={column.align === "right" ? "num" : undefined}>
                  <button type="button" className="th-button" onClick={() => toggleSort(column.key)}>
                    {column.label}
                    {sortIcon(column.key)}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="empty-cell">
                  {emptyMessage}
                </td>
              </tr>
            )}
            {visibleRows.map((row, rowIndex) => (
              <tr key={`${currentPage}-${rowIndex}`}>
                {columns.map((column) => {
                  const custom = renderCell?.(column, row);
                  const raw = row[column.key] ?? null;
                  const text = column.format ? column.format(raw, row) : raw === null ? "-" : String(raw);
                  return (
                    <td key={column.key} className={`${column.align === "right" ? "num" : ""} ${column.nowrap ? "nowrap" : ""}`.trim() || undefined}>
                      {custom ?? text}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pageCount > 1 && (
        <nav className="pager" aria-label="Table pages">
          <button type="button" className="btn btn-ghost" onClick={() => setPage(Math.max(0, currentPage - 1))} disabled={currentPage === 0}>
            Previous
          </button>
          <span>
            Page {currentPage + 1} of {pageCount}
          </span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setPage(Math.min(pageCount - 1, currentPage + 1))}
            disabled={currentPage >= pageCount - 1}
          >
            Next
          </button>
        </nav>
      )}
    </div>
  );
}

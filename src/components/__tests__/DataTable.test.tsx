import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { DataTable } from "../DataTable";
import type { Row } from "../../lib/data";

const rows: Row[] = [
  { product: "Syrup", units: 12 },
  { product: "Tablet", units: 5 },
  { product: "Capsule", units: 30 },
];

const columns = [
  { key: "product", label: "Product" },
  { key: "units", label: "Units", align: "right" as const },
];

describe("DataTable", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows every row and the row count", () => {
    render(<DataTable rows={rows} columns={columns} fileName="test.csv" />);
    expect(screen.getByText("3 of 3 rows")).toBeTruthy();
    expect(screen.getByText("Capsule")).toBeTruthy();
  });

  it("filters rows with the search box", () => {
    render(<DataTable rows={rows} columns={columns} fileName="test.csv" />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "tab" } });
    expect(screen.getByText("1 of 3 rows")).toBeTruthy();
    expect(screen.queryByText("Syrup")).toBeNull();
  });

  it("sorts numbers numerically when a column header is clicked", () => {
    render(<DataTable rows={rows} columns={columns} fileName="test.csv" />);
    fireEvent.click(screen.getByRole("button", { name: /Units/ }));
    const firstCell = screen.getAllByRole("cell")[1];
    expect(firstCell.textContent).toBe("5");
  });
});

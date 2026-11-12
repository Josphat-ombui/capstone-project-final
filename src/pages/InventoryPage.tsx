import { Boxes, Coins, PackageCheck } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { Card } from "../components/Card";
import { DataTable, type ColumnSpec } from "../components/DataTable";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { Section } from "../components/Section";
import { SectionSummary } from "../components/SectionSummary";
import { StatusPill } from "../components/StatusPill";
import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatFraction, formatInteger, formatKesMillions, formatNumber } from "../lib/format";
import { axisProps, gridProps, tooltipContentStyle } from "../lib/chart";
import { palette } from "../lib/palette";
import { targets } from "../lib/targets";

/** Inventory and stock: opening stock, reorder points, cancelled stock and the demand forecast behind them. */
export function InventoryPage({ data }: { data: DashboardData }) {
  const { summary } = data;
  const forecast = summary.forecast;
  const holdout = tableRows(data, "forecast_holdout");
  const selection = tableRows(data, "forecast_selection");
  const paths = tableRows(data, "forecast_paths_holdout");
  const opening = tableRows(data, "opening_stock_range");
  const reorder = tableRows(data, "reorder_points");
  const cancelled = tableRows(data, "cancelled_stock_outflows");

  const openingUnits = opening.reduce((total, row) => total + numberCell(row, "opening_stock_units"), 0);
  const openingUpper = opening.reduce((total, row) => total + numberCell(row, "opening_stock_units_upper"), 0);
  const cancelledValue = cancelled.reduce((total, row) => total + numberCell(row, "value_KES"), 0);
  const cancelledUnits = cancelled.reduce((total, row) => total + numberCell(row, "units"), 0);

  const valueByProduct = new Map<string, number>();
  for (const row of cancelled) {
    const product = textCell(row, "Product_ID");
    valueByProduct.set(product, (valueByProduct.get(product) ?? 0) + numberCell(row, "value_KES"));
  }
  const pareto = [...valueByProduct.entries()].sort((first, second) => second[1] - first[1]);
  let running = 0;
  const paretoChart = pareto.slice(0, 20).map(([product, value]) => {
    running += value;
    return { product, valueMillions: value / 1_000_000, cumulative: (running / cancelledValue) * 100 };
  });
  const topFiveShare = paretoChart[4]?.cumulative ?? Number.NaN;

  const monthly = new Map<string, { actual: number; chosen: number; naive: number }>();
  for (const row of paths) {
    const month = textCell(row, "month");
    const entry = monthly.get(month) ?? { actual: 0, chosen: 0, naive: 0 };
    entry.actual += numberCell(row, "actual");
    entry.chosen += numberCell(row, "forecast_chosen");
    entry.naive += numberCell(row, "forecast_seasonal_naive");
    monthly.set(month, entry);
  }
  const forecastChart = [...monthly.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, value]) => ({ month, ...value }));

  const reorderColumns: ColumnSpec[] = [
    { key: "Branch_Code", label: "Branch", nowrap: true },
    { key: "Product_ID", label: "Product", nowrap: true },
    { key: "monthly_mean", label: "Monthly mean (units)", align: "right", format: (value) => formatNumber(Number(value), 1) },
    { key: "reorder_point_14d", label: "Reorder at 14 days", align: "right", format: (value) => formatInteger(Number(value)) },
    { key: "reorder_point_30d", label: "Reorder at 30 days", align: "right", format: (value) => formatInteger(Number(value)) },
    { key: "reorder_point_60d", label: "Reorder at 60 days", align: "right", format: (value) => formatInteger(Number(value)) },
  ];

  const openingColumns: ColumnSpec[] = [
    { key: "Branch_Code", label: "Branch", nowrap: true },
    { key: "Product_ID", label: "Product", nowrap: true },
    { key: "opening_stock_units", label: "Opening stock, estimate", align: "right", format: (value) => formatInteger(Number(value)) },
    { key: "opening_stock_units_upper", label: "Upper bound", align: "right", format: (value) => formatInteger(Number(value)) },
  ];

  return (
    <>
      <PageHeader questions={["inventory", "forecast"]}
        eyebrow="Inventory and stock"
        title="Stock on hand, reorder points and forecast demand"
        description="Opening stock is an estimate with an upper bound from the inventory records. Reorder points use the demand forecast and a service level of 95%."
        aside={<StatusPill tone={forecast.target_met ? "good" : "bad"}>{forecast.target_met ? "Forecast target met" : "Forecast target missed"}</StatusPill>}
      />

      <SectionSummary
        points={[
          `The chosen forecast (${forecast.chosen_method.toLowerCase()}) has ${formatNumber(forecast.improvement_vs_seasonal_naive_pct, 1)}% lower error than seasonal naive on the 2025 holdout, against a target of ${formatNumber(targets.forecastGainPct, 0)}%.`,
          `The method was fixed on the ${forecast.selection_year} selection year, before the ${forecast.holdout_year} holdout was read. Holt-Winters is shown but not adopted.`,
          `Cancelled stock worth ${formatKesMillions(cancelledValue)} left the shelves; the top five products account for ${formatFraction(topFiveShare / 100, 0)} of it.`,
          `Estimated opening stock is ${formatInteger(openingUnits)} units, and up to ${formatInteger(openingUpper)} units at the upper bound.`,
        ]}
      />

      <Section title="Stock position" intro="Estimated opening stock and the value that was cancelled.">
        <KpiCard icon={Boxes} label="Opening stock, estimate" value={`${formatInteger(openingUnits)} units`} hint={`Upper bound ${formatInteger(openingUpper)} units`} tone="accent" />
        <KpiCard icon={PackageCheck} label="Cancelled stock" value={formatKesMillions(cancelledValue)} hint={`${formatInteger(cancelledUnits)} units across ${formatInteger(cancelled.length)} branch and product pairs`} tone="bad" />
        <KpiCard icon={Coins} label="Top five products" value={formatFraction(topFiveShare / 100, 0)} hint="Share of cancelled value" tone="warn" />
      </Section>

      <Section title="Demand forecast" intro="Monthly demand across the 60 highest-volume product and branch pairs, 2025 holdout.">
        <Card title="Forecast against actual demand" subtitle="Sum of the 60 series by month" caption={`Method chosen on ${forecast.selection_year}: ${forecast.chosen_method}. Seasonal naive is the benchmark.`}>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastChart}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => formatInteger(Number(value))} />
                <Legend />
                <Line type="monotone" dataKey="actual" name="Actual" stroke={palette.axis} strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="chosen" name="Chosen method" stroke={palette.accent} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="naive" name="Seasonal naive" stroke={palette.warn} strokeDasharray="4 4" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Forecast error by method" subtitle="Holdout 2025, lower is better" caption="The selection table shows the same methods on 2024, the year used to choose the method.">
          <DataTable
            rows={holdout}
            fileName="forecast_holdout.csv"
            columns={[
              { key: "method", label: "Method" },
              { key: "wape_pct", label: "Error (WAPE %)", align: "right", format: (value) => formatNumber(Number(value), 1) },
              { key: "rmse", label: "RMSE", align: "right", format: (value) => formatNumber(Number(value), 1) },
              { key: "bias_pct", label: "Bias %", align: "right", format: (value) => formatNumber(Number(value), 1) },
            ]}
            pageSize={4}
          />
          <p className="muted small">Selection year {forecast.selection_year}: {selection.map((row) => `${textCell(row, "method")} ${formatNumber(numberCell(row, "wape_pct"), 1)}%`).join("; ")}.</p>
        </Card>
      </Section>

      <Section title="Reorder points and opening stock" intro="Reorder levels for each branch and product, and the estimated opening stock.">
        <Card title="Reorder points" subtitle="Units on hand that trigger a reorder at each lead time" caption="Lead times are 14, 30 and 60 days; the service level is 95%.">
          <DataTable rows={reorder} columns={reorderColumns} fileName="reorder_points.csv" pageSize={10} searchKeys={["Branch_Code", "Product_ID"]} />
        </Card>
        <Card title="Opening stock estimate" subtitle="With the upper bound from the inventory records">
          <DataTable rows={opening} columns={openingColumns} fileName="opening_stock_range.csv" pageSize={10} searchKeys={["Branch_Code", "Product_ID"]} />
        </Card>
      </Section>

      <Section title="Cancelled stock" intro="Products whose stock left through cancelled orders, ranked by value.">
        <Card title="Cancelled stock value by product" subtitle="Top 20 products with the cumulative share" caption="A short list of products carries most of the cancelled value, so the fix is targeted.">
          <div className="chart chart-tall">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={paretoChart}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="product" {...axisProps} interval={0} tick={{ fontSize: 10 }} angle={-40} textAnchor="end" height={60} />
                <YAxis {...axisProps} unit=" m" />
                <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => `KES ${formatNumber(Number(value), 2)} m`} />
                <Bar dataKey="valueMillions" name="Cancelled value" fill={palette.accent} radius={4}>
                  {paretoChart.map((row) => (
                    <Cell key={row.product} fill={row.cumulative <= 80 ? palette.accent : palette.accentSoft} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Section>
    </>
  );
}

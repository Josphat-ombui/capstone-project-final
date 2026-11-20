import { Factory, TrendingUp, Users } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { Section } from "../components/Section";
import { SectionSummary } from "../components/SectionSummary";
import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatInteger, formatNumber } from "../lib/format";
import { axisProps, gridProps, tooltipContentStyle } from "../lib/chart";
import { palette } from "../lib/palette";
import { targets } from "../lib/targets";
import { useState } from "react";
import { LevelChips } from "../components/ChartControls";
import { FilterNotice } from "../components/FilterNotice";
import { useFilters } from "../components/FilterContext";
import { yearInRange } from "../lib/filters";

/** Cost and suppliers: input cost trend, supplier premiums, concentration and how cost changes pass through to price. */
export function CostPage({ data }: { data: DashboardData }) {
  const { filters } = useFilters();
  const [topN, setTopN] = useState(12);
  const [shownCategories, setShownCategories] = useState<string[]>([]);
  const { summary } = data;
  const trend = summary.cost_trend;
  const spread = summary.product_year_spread;
  const premiums = tableRows(data, "supplier_premium");
  const passThrough = tableRows(data, "pass_through_by_category");
  const concentration = tableRows(data, "supplier_concentration").filter((row) => yearInRange(numberCell(row, "year"), filters));
  const latestHhi = concentration[concentration.length - 1] ?? {};
  const hhiValue = numberCell(latestHhi, "hhi");
  const highPremium = premiums.filter((row) => numberCell(row, "premium_pct") > 0).length;

  const premiumChart = [...premiums]
    .sort((first, second) => numberCell(second, "premium_pct") - numberCell(first, "premium_pct"))
    .slice(0, topN)
    .map((row) => ({ supplier: textCell(row, "Supplier_ID"), premium: numberCell(row, "premium_pct") }));

  const passChart = passThrough
    .filter((row) => shownCategories.length === 0 || shownCategories.includes(textCell(row, "category")))
    .map((row) => ({
    category: textCell(row, "category"),
    elasticity: numberCell(row, "elasticity"),
    low: numberCell(row, "low"),
    high: numberCell(row, "high"),
  }));

  return (
    <>
      <PageHeader questions={["costs"]}
        eyebrow="Cost and suppliers"
        title="Input costs, supplier premiums and pass-through"
        description="How supplier prices change over time, which suppliers charge above the going rate, and how far a cost change reaches the selling price."
      />

      <SectionSummary
        points={[
          `Supplier prices rise by ${formatNumber(trend.growth_pct_per_year, 1)}% a year across ${formatInteger(trend.products)} products and ${formatInteger(trend.receipts)} receipts.`,
          `${formatInteger(highPremium)} of ${formatInteger(premiums.length)} suppliers charge above the reference price for the goods they supply.`,
          `Supplier concentration is ${formatInteger(hhiValue)} on the HHI scale in ${numberCell(latestHhi, "year")}, ${hhiValue >= targets.hhiThreshold ? "above" : "below"} the ${formatInteger(targets.hhiThreshold)} concentration threshold.`,
          `Each product has ${spread.with_more_than_one_cost === 0 ? "one cost in each year" : `more than one cost in ${formatInteger(spread.with_more_than_one_cost)} product-years`}, so the cost base is consistent within a year.`,
        ]}
      />

      <FilterNotice>Supplier concentration follows the year range. The cost trend, supplier premiums and pass-through are full-period, so the batch filters do not change them.</FilterNotice>
      <Section title="Cost position" intro="Headline figures for input costs and supplier concentration.">
        <KpiCard icon={TrendingUp} label="Price growth a year" value={`${formatNumber(trend.growth_pct_per_year, 1)}%`} hint={`Range ${formatNumber(trend.low_pct, 2)}% to ${formatNumber(trend.high_pct, 2)}%`} tone="warn" />
        <KpiCard icon={Users} label="Supplier concentration (HHI)" value={formatInteger(hhiValue)} hint={`Threshold ${formatInteger(targets.hhiThreshold)}`} tone={hhiValue >= targets.hhiThreshold ? "bad" : "good"} />
        <KpiCard icon={Factory} label="Suppliers above reference" value={formatInteger(highPremium)} hint={`of ${formatInteger(premiums.length)} suppliers`} tone="info" />
      </Section>

      <Section title="Supplier premiums" intro="Price paid compared with the reference price for the same product.">
        <Card title="Supplier premium against the reference price" subtitle={`Top ${Math.min(topN, premiums.length)} suppliers; every premium is zero in this data`} caption="Each bar is the percentage a supplier charges above the reference price. All premiums are zero, so no supplier is charged above the reference; the chart shows that directly.">
          <div className="level-chips" role="group" aria-label="Suppliers shown">
            {[5, 10, premiums.length].filter((n, index, all) => n > 0 && n <= premiums.length && all.indexOf(n) === index).map((n) => (
              <button key={n} type="button" className="chip chip-small" aria-pressed={topN === n} onClick={() => setTopN(n)}>
                {n === premiums.length ? "All" : `Top ${n}`}
              </button>
            ))}
          </div>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={premiumChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                <CartesianGrid {...gridProps} horizontal={false} />
                <XAxis type="number" {...axisProps} unit="%" />
                <YAxis type="category" dataKey="supplier" width={110} {...axisProps} />
                <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => `${formatNumber(Number(value), 2)}%`} />
                <Bar dataKey="premium" name="Premium" radius={4}>
                  {premiumChart.map((row) => (
                    <Cell key={row.supplier} fill={row.premium > 0 ? palette.warn : palette.good} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Supplier table" subtitle="All suppliers, searchable">
          <DataTable
            rows={premiums}
            fileName="supplier_premium.csv"
            columns={[
              { key: "Supplier_ID", label: "Supplier", nowrap: true },
              { key: "receipts", label: "Receipts", align: "right", format: (value) => formatInteger(Number(value)) },
              { key: "premium_pct", label: "Premium %", align: "right", format: (value) => formatNumber(Number(value), 2) },
            ]}
            pageSize={8}
            searchKeys={["Supplier_ID"]}
          />
        </Card>
      </Section>

      <Section title="Pass-through to price" intro="How much of a cost change reaches the selling price, by product category.">
        <Card title="Pass-through elasticity by category" subtitle="Share of a cost change that reaches the price, with the 95% range" caption="A value of 1 means the full cost change reaches the price; the range shows the uncertainty.">
          <LevelChips label="Categories shown" levels={passThrough.map((row) => textCell(row, "category"))} selected={shownCategories} onChange={setShownCategories} />
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={passChart}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="category" {...axisProps} interval={0} tick={{ fontSize: 11 }} />
                <YAxis {...axisProps} />
                <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => formatNumber(Number(value), 2)} />
                <Bar dataKey="elasticity" name="Pass-through" fill={palette.accent} radius={6} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <DataTable
            rows={passThrough}
            fileName="pass_through_by_category.csv"
            columns={[
              { key: "category", label: "Category" },
              { key: "elasticity", label: "Pass-through", align: "right", format: (value) => formatNumber(Number(value), 2) },
              { key: "low", label: "Low", align: "right", format: (value) => formatNumber(Number(value), 2) },
              { key: "high", label: "High", align: "right", format: (value) => formatNumber(Number(value), 2) },
              { key: "observations", label: "Observations", align: "right", format: (value) => formatInteger(Number(value)) },
            ]}
            pageSize={6}
          />
        </Card>
      </Section>
    </>
  );
}

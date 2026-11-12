import { BadgeDollarSign, Percent, Receipt } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Legend, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { Section } from "../components/Section";
import { SectionSummary } from "../components/SectionSummary";
import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatFraction, formatKesMillions, formatNumber, formatPercent } from "../lib/format";
import { axisProps, gridProps, tooltipContentStyle } from "../lib/chart";
import { palette } from "../lib/palette";

/** The three volume cases of the discount policy, named by how much of the volume response is lost. */
const caseLabels: Record<string, string> = {
  none: "No volume loss",
  half: "Half the volume response lost",
  all: "All the volume response lost",
};

/** Margin and discounts: what the 5% cap would do to profit, and how margin moves with discount depth. */
export function MarginPage({ data }: { data: DashboardData }) {
  const { summary } = data;
  const capPct = summary.assumptions.discount_cap_pct;
  const outTime = summary.discount.fitted_to_validation_end ?? summary.discount.full_period;
  const scenarios = tableRows(data, "discount_cap_scenarios").map((row) => ({
    key: textCell(row, "assumption"),
    label: caseLabels[textCell(row, "assumption")] ?? textCell(row, "assumption"),
    profit: numberCell(row, "profit_change_KES") / 1_000_000,
    perYear: numberCell(row, "profit_change_KES_per_year") / 1_000_000,
    retained: numberCell(row, "volume_retained_pct"),
    orders: numberCell(row, "orders_capped"),
  }));
  const scenarioOf = (key: string) => scenarios.find((row) => row.key === key);
  const none = scenarioOf("none");
  const all = scenarioOf("all");
  const half = scenarioOf("half");

  const margin = tableRows(data, "margin_by_discount").map((row) => ({
    discount: `${numberCell(row, "Discount_Pct")}%`,
    margin: numberCell(row, "gross_margin_pct"),
    orders: numberCell(row, "orders"),
  }));

  return (
    <>
      <PageHeader questions={["discount"]}
        eyebrow="Margin and discounts"
        title={`What a ${formatNumber(capPct, 0)}% discount cap does to profit`}
        description="The cap is tested on 2024 to 2025 orders with the volume response estimated only from 2014 to 2023, so the test period is out of sample."
      />

      <SectionSummary
        points={[
          `Capping discounts at ${formatNumber(capPct, 0)}% adds ${formatKesMillions((none?.profit ?? Number.NaN) * 1_000_000)} over 2024 to 2025 if no volume is lost.`,
          `If half of the volume response is lost, the gain falls to ${formatKesMillions((half?.profit ?? Number.NaN) * 1_000_000)}. If all of it is lost, profit falls by ${formatKesMillions(Math.abs(all?.profit ?? Number.NaN) * 1_000_000)}.`,
          `Each discount point is associated with ${formatPercent(outTime.pct_per_point, 2)} more units. The cap pays only if the volume response is smaller than the estimate allows.`,
          "The cap is a policy choice to pilot in one branch, not a change to roll out.",
        ]}
      />

      <Section title="Profit under the cap" intro="Change in gross profit against the actual 2024 to 2025 policy.">
        <KpiCard icon={BadgeDollarSign} label="No volume loss" value={formatKesMillions((none?.profit ?? Number.NaN) * 1_000_000)} hint="Upper bound on the gain" tone="good" />
        <KpiCard icon={Receipt} label="Half the response lost" value={formatKesMillions((half?.profit ?? Number.NaN) * 1_000_000)} hint={`${formatFraction((half?.retained ?? Number.NaN) / 100, 1)} of orders kept`} tone="warn" />
        <KpiCard icon={Percent} label="All the response lost" value={formatKesMillions((all?.profit ?? Number.NaN) * 1_000_000)} hint={`${formatFraction((all?.retained ?? Number.NaN) / 100, 1)} of orders kept`} tone={(all?.profit ?? 0) < 0 ? "bad" : "good"} />
      </Section>

      <Section title="Scenarios and margin" intro="The three volume cases, and gross margin at each discount depth.">
        <Card title="Profit change by volume case" subtitle="Two calendar years, KES million" caption={`Volume response from the 2014 to 2023 estimate: ${formatNumber(outTime.pct_low, 2)}% to ${formatNumber(outTime.pct_high, 2)}% more units per discount point (95% interval).`}>
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scenarios}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="label" {...axisProps} interval={0} tick={{ fontSize: 11 }} />
                <YAxis {...axisProps} unit=" m" />
                <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => `KES ${formatNumber(Number(value), 1)} m`} />
                <ReferenceLine y={0} stroke={palette.axis} />
                <Bar dataKey="profit" name="Profit change" radius={6}>
                  {scenarios.map((row) => (
                    <Cell key={row.key} fill={row.profit >= 0 ? palette.good : palette.bad} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Gross margin by discount depth" subtitle="Margin falls as the discount grows" caption="Bars show orders at each discount level; the line shows gross margin.">
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={margin}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="discount" {...axisProps} />
                <YAxis yAxisId="left" {...axisProps} />
                <YAxis yAxisId="right" orientation="right" {...axisProps} unit="%" />
                <Tooltip contentStyle={tooltipContentStyle} />
                <Legend />
                <Bar yAxisId="left" dataKey="orders" name="Orders" fill={palette.accentSoft} radius={4} />
                <Line yAxisId="right" type="monotone" dataKey="margin" name="Gross margin" stroke={palette.bad} strokeWidth={2.5} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Section>

      <Section title="Scenario table" intro="The same figures as the chart, with orders kept and profit per year.">
        <Card title="Discount cap scenarios" subtitle={`Cap at ${formatNumber(capPct, 0)}%, 2024 to 2025`}>
          <DataTable
            rows={tableRows(data, "discount_cap_scenarios")}
            fileName="discount_cap_scenarios.csv"
            columns={[
              { key: "assumption", label: "Case", format: (value) => caseLabels[String(value)] ?? String(value) },
              { key: "orders_capped", label: "Orders capped", align: "right", format: (value) => formatNumber(Number(value), 0) },
              { key: "profit_change_KES", label: "Profit change (KES)", align: "right", format: (value) => formatNumber(Number(value), 0) },
              { key: "profit_change_KES_per_year", label: "Per year (KES)", align: "right", format: (value) => formatNumber(Number(value), 0) },
              { key: "volume_retained_pct", label: "Volume kept", align: "right", format: (value) => formatNumber(Number(value), 1) + "%" },
            ]}
            pageSize={5}
          />
        </Card>
      </Section>
    </>
  );
}

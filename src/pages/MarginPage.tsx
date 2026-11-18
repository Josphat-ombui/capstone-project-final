import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatInteger, formatKesMillions, formatNumber, formatPercent } from "../lib/format";
import { palette } from "../lib/palette";
import { Bars, Findings, Grid, Kpi, Kpis, Page, Panel, Plot, Section, TableCard, type Finding } from "../components/Dash";
import type { ColumnSpec } from "../components/DataTable";

const scenarioLabel: Record<string, string> = {
  none: "No volume lost",
  half: "Half of the lift lost",
  all: "All of the lift lost",
};

const scenarioColumns: ColumnSpec[] = [
  { key: "assumption", label: "Scenario", format: (v) => scenarioLabel[String(v)] ?? String(v) },
  { key: "orders_capped", label: "Orders capped", align: "right", format: (v) => formatInteger(Number(v)) },
  { key: "profit_change_KES_per_year", label: "Profit change per year", align: "right", format: (v) => formatKesMillions(Number(v), 1) },
  { key: "volume_retained_pct", label: "Volume kept", align: "right", format: (v) => formatPercent(Number(v), 1) },
];

const marginColumns: ColumnSpec[] = [
  { key: "Discount_Pct", label: "Discount", align: "right", format: (v) => `${formatNumber(Number(v), 0)}%` },
  { key: "orders", label: "Orders", align: "right", format: (v) => formatInteger(Number(v)) },
  { key: "net_revenue_KES", label: "Net revenue", align: "right", format: (v) => formatKesMillions(Number(v), 1) },
  { key: "cogs_KES", label: "Cost of goods", align: "right", format: (v) => formatKesMillions(Number(v), 1) },
  { key: "gross_margin_pct", label: "Gross margin", align: "right", format: (v) => formatPercent(Number(v), 1) },
];

export function MarginPage({ data }: { data: DashboardData }) {
  const d = data.summary.discount;
  const sc = tableRows(data, "discount_cap_scenarios");
  const margins = tableRows(data, "margin_by_discount");
  const perYear = (k: string) => numberCell(sc.find((r) => textCell(r, "assumption") === k) ?? {}, "profit_change_KES_per_year");
  const best = perYear("none");
  const worst = perYear("all");

  const findings: Finding[] = [
    { tag: "Opportunity", tone: "accent", text: `Pilot the ${formatNumber(d.cap_pct, 0)}% cap in one branch. If no volume is lost it adds about ${formatKesMillions(best, 1)} a year.` },
    { tag: "Caution", tone: worst < 0 ? "bad" : "warn", text: worst < 0 ? `If customers stop buying the discounted volume, the cap loses ${formatKesMillions(Math.abs(worst), 1)} a year. The result depends on volume.` : `Even if all of the lift is lost, the cap still adds ${formatKesMillions(worst, 1)} a year.` },
    { tag: "Model", tone: "warn", text: `Each discount point is linked to ${formatNumber(d.full_period.pct_per_point, 1)}% more orders, but the fit is weak (R² ${formatNumber(d.full_period.r_squared, 2)}).` },
  ];

  return (
    <Page
      eyebrow="Commercial and supply"
      title="Margin and discounts"
      question={`Would capping discounts at ${formatNumber(d.cap_pct, 0)}% add profit?`}
      status={worst < 0 ? { tone: "warn", text: "Depends on volume" } : { tone: "good", text: "Upside" }}
      questionIds={["discount"]}
    >
      <Kpis>
        <Kpi tone="accent" label="Gross margin" value={formatPercent(d.overall_margin_pct, 1)} caption="across all orders" />
        <Kpi tone="accent" label="Proposed cap" value={`${formatNumber(d.cap_pct, 0)}%`} caption={`${formatInteger(numberCell(sc[0] ?? {}, "orders_capped"))} orders affected`} />
        <Kpi tone="good" label="Best case, per year" value={formatKesMillions(best, 1)} caption="no volume lost" />
        <Kpi tone={worst < 0 ? "bad" : "good"} label="Worst case, per year" value={formatKesMillions(worst, 1)} caption="all of the lift lost" />
      </Kpis>

      <Section title="Key points">
        <Findings items={findings} />
      </Section>

      <Section title="Charts" note="Gross margin at each discount level, and what the cap does to profit under each scenario.">
        <Grid cols={2}>
          <Panel title="Gross margin by discount, %" note="Margin falls as the discount rises.">
            <Plot>
              <Bars data={margins.map((r) => ({ name: `${formatNumber(numberCell(r, "Discount_Pct"), 0)}%`, value: Number(numberCell(r, "gross_margin_pct").toFixed(1)) }))} fmt={(v) => `${formatNumber(v, 1)}%`} colorOf={() => palette.accent} />
            </Plot>
          </Panel>
          <Panel title="Cap impact on profit, KES m per year" note="Green is a gain; red is a loss.">
            <Plot>
              <Bars data={sc.map((r) => ({ name: scenarioLabel[textCell(r, "assumption")] ?? textCell(r, "assumption"), value: Math.round(numberCell(r, "profit_change_KES_per_year") / 1e6) }))} fmt={(v) => formatInteger(v)} colorOf={(x) => (x.value >= 0 ? palette.good : palette.bad)} />
            </Plot>
          </Panel>
        </Grid>
      </Section>

      <Section title="Detail">
        <TableCard title="Cap scenarios" note="What the cap does under each assumption about lost volume." rows={sc} columns={scenarioColumns} fileName="discount-cap-scenarios.csv" pageSize={5} />
        <TableCard title="Margin by discount level" note="Orders, revenue, cost and margin at each discount level." rows={margins} columns={marginColumns} fileName="margin-by-discount.csv" pageSize={5} />
      </Section>
    </Page>
  );
}

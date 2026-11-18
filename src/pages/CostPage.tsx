import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatInteger, formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { targets } from "../lib/targets";
import { Bars, Findings, Grid, Kpi, Kpis, Page, Panel, Plot, Section, TableCard, Trend, type Finding } from "../components/Dash";
import type { ColumnSpec } from "../components/DataTable";

const pct = (v: number) => `${formatNumber(v, 1)}%`;

const concentrationColumns: ColumnSpec[] = [
  { key: "year", label: "Year", align: "right" },
  { key: "hhi", label: "Concentration (HHI)", align: "right", format: (v) => formatInteger(Number(v)) },
  { key: "label", label: "Reading" },
  { key: "top_supplier", label: "Largest supplier" },
  { key: "top_share_pct", label: "Largest supplier share", align: "right", format: (v) => pct(Number(v)) },
];

const passColumns: ColumnSpec[] = [
  { key: "category", label: "Category" },
  { key: "elasticity", label: "Volume response to price", align: "right", format: (v) => formatNumber(Number(v), 2) },
  { key: "low", label: "Range, low", align: "right", format: (v) => formatNumber(Number(v), 2) },
  { key: "high", label: "Range, high", align: "right", format: (v) => formatNumber(Number(v), 2) },
  { key: "observations", label: "Observations", align: "right", format: (v) => formatInteger(Number(v)) },
];

export function CostPage({ data }: { data: DashboardData }) {
  const s = data.summary;
  const sup = tableRows(data, "supplier_concentration");
  const last = sup[sup.length - 1];
  const hhi = numberCell(last, "hhi");
  const premiums = tableRows(data, "supplier_premium");
  const charging = premiums.filter((r) => numberCell(r, "premium_pct") > 0);
  const topPremium = [...premiums].sort((a, b) => numberCell(b, "premium_pct") - numberCell(a, "premium_pct")).slice(0, 10);
  const maxPremium = topPremium[0] ? numberCell(topPremium[0], "premium_pct") : 0;
  const passThrough = tableRows(data, "pass_through_by_category").map((r) => ({ name: textCell(r, "category"), value: Number(Math.abs(numberCell(r, "elasticity")).toFixed(2)) }));

  const findings: Finding[] = [
    { tag: "Risk", tone: "bad", text: `Purchase costs rise about ${formatNumber(s.cost_trend.growth_pct_per_year, 1)}% a year, within a narrow band of ${formatNumber(s.cost_trend.low_pct, 1)}% to ${formatNumber(s.cost_trend.high_pct, 1)}%.` },
    { tag: "Strength", tone: hhi < targets.hhiThreshold ? "good" : "bad", text: `No supplier dependence: concentration stays well under the limit of ${formatInteger(targets.hhiThreshold)} in every year.` },
    { tag: "Premiums", tone: charging.length ? "warn" : "good", text: `${charging.length} of ${premiums.length} suppliers charge a premium above the reference price, up to ${formatNumber(maxPremium, 1)}%.` },
  ];

  return (
    <Page
      eyebrow="Commercial and supply"
      title="Costs and suppliers"
      question="How fast are costs rising, and do a few suppliers dominate or charge premiums?"
      status={hhi < targets.hhiThreshold ? { tone: "good", text: "Low concentration" } : { tone: "bad", text: "Concentrated" }}
      questionIds={["costs"]}
    >
      <Kpis>
        <Kpi tone="bad" label="Purchase cost growth" value={`+${formatNumber(s.cost_trend.growth_pct_per_year, 1)}% a year`} caption={`${formatInteger(s.cost_trend.receipts)} receipts, ${formatInteger(s.cost_trend.products)} products`} />
        <Kpi tone={hhi < targets.hhiThreshold ? "good" : "bad"} label="Supplier concentration (HHI)" value={formatInteger(hhi)} caption={`limit ${formatInteger(targets.hhiThreshold)}; ${textCell(last, "label")}`} />
        <Kpi tone="accent" label="Largest supplier share" value={pct(numberCell(last, "top_share_pct"))} caption={textCell(last, "top_supplier")} />
        <Kpi tone={charging.length ? "warn" : "good"} label="Suppliers charging a premium" value={`${charging.length} of ${premiums.length}`} caption={`up to ${formatNumber(maxPremium, 1)}% above reference`} />
      </Kpis>

      <Section title="Key points">
        <Findings items={findings} />
      </Section>

      <Section title="Charts" note="How concentration has changed, how much volume responds to price, and which suppliers charge the most.">
        <Grid cols={3}>
          <Panel title="Supplier concentration (HHI)" note="Dashed line: the concentration limit.">
            <Plot tall>
              <Trend data={sup.map((r) => ({ name: String(numberCell(r, "year")), value: Math.round(numberCell(r, "hhi")) }))} fmt={(v) => formatInteger(v)} refValue={targets.hhiThreshold} tickEvery={1} />
            </Plot>
          </Panel>
          <Panel title="Volume response to price" note="Bigger bars mean volume reacts more to a price change in that category.">
            <Plot tall>
              <Bars horizontal data={passThrough} fmt={(v) => formatNumber(v, 2)} colorOf={() => palette.accent} />
            </Plot>
          </Panel>
          <Panel title="Top 10 suppliers by premium, %" note="Premium above the reference price, by supplier.">
            <Plot tall>
              <Bars horizontal data={topPremium.map((r) => ({ name: textCell(r, "Supplier_ID"), value: Number(numberCell(r, "premium_pct").toFixed(1)) }))} fmt={(v) => `${formatNumber(v, 1)}%`} colorOf={(d) => (d.value > 0 ? palette.warn : palette.good)} />
            </Plot>
          </Panel>
        </Grid>
      </Section>

      <Section title="Detail">
        <TableCard title="Supplier concentration by year" note="HHI below 1,500 means no supplier dominates." rows={sup} columns={concentrationColumns} fileName="supplier-concentration.csv" pageSize={12} />
        <TableCard title="Volume response to price by category" note="A negative value means volume falls when the price rises." rows={tableRows(data, "pass_through_by_category")} columns={passColumns} fileName="price-response.csv" pageSize={6} />
      </Section>
    </Page>
  );
}

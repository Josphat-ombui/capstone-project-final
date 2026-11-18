import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatFraction, formatInteger, formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { Alerts, Bars, Charts, Insights, Kpi, Kpis, Page, Panel, Trendline } from "../components/Exec";
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const pct = (v: number) => `${formatNumber(v, 1)}%`;

export function ReceivablesPage({ data }: { data: DashboardData }) {
  const g = data.summary.credit_gate;
  const age = tableRows(data, "credit_ageing");
  const open = sum(age.map((r) => numberCell(r, "open_balance_KES")));
  const old = sum(age.filter((r) => textCell(r, "bucket").startsWith("over")).map((r) => numberCell(r, "open_balance_KES")));
  const fail = g.status === "FAIL";
  const share = tableRows(data, "credit_open_share").map((r) => ({ name: String(numberCell(r, "year")), value: Number((numberCell(r, "open_share") * 100).toFixed(1)) }));
  return (
    <Page title="Credit and receivables" status={fail ? { tone: "bad", text: "Data unverified" } : { tone: "good", text: "Verified" }}>
      <Kpis>
        <Kpi label="Open balance, KES" value={`${formatNumber(open / 1e9, 1)} bn`} tone={fail ? "bad" : "accent"} />
        <Kpi label="Over 1 year" value={formatFraction(old / open, 0)} tone="bad" />
        <Kpi label="Open invoices" value={formatInteger(sum(age.map((r) => numberCell(r, "invoices"))))} tone="accent" />
        <Kpi label="Latest year still open" value={formatFraction(g.latest_year_open_share, 0)} tone={fail ? "bad" : "good"} />
      </Kpis>
      <Charts>
        <Panel title="Open balance by age, KES m"><Bars data={age.map((r) => ({ name: textCell(r, "bucket"), value: Math.round(numberCell(r, "open_balance_KES") / 1e6) }))} fmt={(v) => formatInteger(v)} colorOf={(d) => (d.name.startsWith("over") ? palette.bad : palette.accent)} /></Panel>
        <Panel title="Share still open by sale year, %"><Trendline data={share} fmt={pct} tickEvery={1} /></Panel>
      </Charts>
      <Insights items={[{ tag: "Risk", tone: "bad", text: "Old sales look as open as new ones: payments are probably not recorded." }]} />
      <Alerts items={[fail && "Reconcile with finance before collections"]} />
    </Page>
  );
}

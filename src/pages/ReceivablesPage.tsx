import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatFraction, formatInteger, formatKesMillions, formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { targets } from "../lib/targets";
import { Alerts, Area, Bars, Charts, Curve, Donut, Forest, GroupedBars, Heat, Insights, Kpi, Kpis, Matrix2, Page, Panel, Ring, toneColour } from "../components/Exec";
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const pct = (v: number) => `${formatNumber(v, 1)}%`;
const ex = (d: DashboardData) => d.explore as unknown as Record<string, any>; // eslint-disable-line
const short = (n: string, k = 24) => (n.length > k ? `${n.slice(0, k - 1)}…` : n);
void [Alerts, Area, Bars, Charts, Curve, Donut, Forest, GroupedBars, Heat, Insights, Kpi, Kpis, Matrix2, Page, Panel, Ring, toneColour, numberCell, tableRows, textCell, formatFraction, formatInteger, formatKesMillions, palette, targets, sum, pct, ex, short];

export function ReceivablesPage({ data }: { data: DashboardData }) {
  const g = data.summary.credit_gate, fail = g.status === "FAIL";
  const age = tableRows(data, "credit_ageing");
  const open = sum(age.map((r) => numberCell(r, "open_balance_KES")));
  const old = sum(age.filter((r) => textCell(r, "bucket").startsWith("over")).map((r) => numberCell(r, "open_balance_KES")));
  const share = tableRows(data, "credit_open_share").map((r) => ({ name: String(numberCell(r, "year")), value: Number((numberCell(r, "open_share") * 100).toFixed(1)) }));
  const m = (r: Record<string, unknown>) => Math.round(numberCell(r as never, "open_balance_KES") / 1e6);
  return (
    <Page title="Credit and receivables" status={fail ? { tone: "bad", text: "Data unverified" } : { tone: "good", text: "Verified" }}>
      <Kpis>
        <Kpi label="Open balance, KES" value={`${formatNumber(open / 1e9, 1)} bn`} tone={fail ? "bad" : "accent"} />
        <Kpi label="Over 1 year" value={formatFraction(old / open, 0)} ring={{ value: old / open }} tone="bad" />
        <Kpi label="Open invoices" value={formatInteger(sum(age.map((r) => numberCell(r, "invoices"))))} tone="accent" />
        <Kpi label="Latest year still open" value={formatFraction(g.latest_year_open_share, 0)} ring={{ value: g.latest_year_open_share }} tone={fail ? "bad" : "good"} />
      </Kpis>
      <Charts cols={3}>
        <Panel title="Open balance by age"><Donut data={age.map((r) => ({ name: textCell(r, "bucket"), value: m(r) }))} center={`${formatNumber(open / 1e9, 1)} bn`} fmt={(v) => `KES ${formatInteger(v)} m`} /></Panel>
        <Panel title="Balance by age, KES m"><Bars data={age.map((r) => ({ name: textCell(r, "bucket"), value: m(r) }))} fmt={formatInteger} colorOf={(d) => (d.name.startsWith("over") ? palette.bad : palette.accent)} /></Panel>
        <Panel title="Invoices by age"><Bars data={age.map((r) => ({ name: textCell(r, "bucket"), value: numberCell(r, "invoices") }))} fmt={formatInteger} colorOf={(d) => (d.name.startsWith("over") ? palette.bad : palette.muted)} /></Panel>
      </Charts>
      <Charts cols={1}><Panel title="Share still open by sale year, %" h={240}><Area data={share} fmt={pct} tickEvery={0} id="rc" /></Panel></Charts>
      <Insights items={[{ tag: "Risk", tone: "bad", text: "Old sales look as open as new ones: payments are probably not recorded." }]} />
      <Alerts items={[fail && "Reconcile with finance before collections"]} />
    </Page>
  );
}

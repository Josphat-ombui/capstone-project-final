import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { Bars, Charts, Insights, Kpi, Kpis, Page, Panel } from "../components/Exec";
const pct = (v: number) => `${formatNumber(v, 1)}%`;

export function EquipmentPage({ data }: { data: DashboardData }) {
  const eq = tableRows(data, "equipment_reliability");
  const av = tableRows(data, "availability_scenarios");
  const watch = eq.filter((r) => textCell(r, "priority").startsWith("Watch")).length;
  const high = eq.filter((r) => textCell(r, "priority").startsWith("High")).length;
  const sig = eq.filter((r) => numberCell(r, "ratio_ci_low") > 1).length;
  const short = (n: string) => (n.length > 24 ? `${n.slice(0, 23)}…` : n);
  const ratios = [...eq].sort((a, b) => numberCell(b, "standardised_ratio") - numberCell(a, "standardised_ratio")).slice(0, 8);
  const lows = [...av].sort((a, b) => numberCell(a, "availability_if_repair_8h") - numberCell(b, "availability_if_repair_8h")).slice(0, 8);
  const low = lows[0];
  return (
    <Page title="Equipment health" status={high ? { tone: "bad", text: "Action needed" } : watch ? { tone: "warn", text: "Watch list" } : { tone: "good", text: "Healthy" }}>
      <Kpis>
        <Kpi label="Machines" value={String(eq.length)} tone="accent" />
        <Kpi label="High priority" value={String(high)} tone={high ? "bad" : "good"} />
        <Kpi label="On watch" value={String(watch)} tone={watch ? "warn" : "good"} />
        <Kpi label="Lowest uptime" value={low ? `${formatNumber(numberCell(low, "availability_if_repair_8h") * 100, 0)}%` : "-"} sub={low ? short(textCell(low, "equipment_name")) : ""} tone="warn" />
      </Kpis>
      <Charts>
        <Panel title="Failures vs expected (1.0 = as expected)"><Bars horizontal data={ratios.map((r) => ({ name: short(textCell(r, "equipment_name")), value: Number(numberCell(r, "standardised_ratio").toFixed(2)) }))} fmt={(v) => formatNumber(v, 2)} refValue={1} colorOf={(d) => (d.value > 1 ? palette.warn : palette.muted)} /></Panel>
        <Panel title="Uptime with 8h repairs, %"><Bars horizontal data={lows.map((r) => ({ name: short(textCell(r, "equipment_name")), value: Number((numberCell(r, "availability_if_repair_8h") * 100).toFixed(1)) }))} fmt={pct} colorOf={(d) => (d.value < 96 ? palette.warn : palette.good)} /></Panel>
      </Charts>
      <Insights items={[{ tag: "Signal", tone: sig ? "bad" : "good", text: sig ? `${sig} machines fail significantly above expected.` : "No machine is significantly above expected." }]} />
    </Page>
  );
}

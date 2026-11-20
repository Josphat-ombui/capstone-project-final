import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { useFilters } from "../components/FilterContext";
import { FilterNotice } from "../components/FilterNotice";
import { passesSection } from "../lib/filters";
import { formatFraction, formatInteger, formatKesMillions, formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { targets } from "../lib/targets";
import { Alerts, Area, Bars, Charts, Curve, Donut, Forest, GroupedBars, Heat, Insights, Kpi, Kpis, Matrix2, Page, Panel, Ring, toneColour } from "../components/Exec";
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const pct = (v: number) => `${formatNumber(v, 1)}%`;
const ex = (d: DashboardData) => d.explore as unknown as Record<string, any>; // eslint-disable-line
const short = (n: string, k = 24) => (n.length > k ? `${n.slice(0, k - 1)}…` : n);
void [Alerts, Area, Bars, Charts, Curve, Donut, Forest, GroupedBars, Heat, Insights, Kpi, Kpis, Matrix2, Page, Panel, Ring, toneColour, numberCell, tableRows, textCell, formatFraction, formatInteger, formatKesMillions, palette, targets, sum, pct, ex, short];

export function EquipmentPage({ data }: { data: DashboardData }) {
  const { filters } = useFilters();
  const allEq = tableRows(data, "equipment_reliability");
  const eq = allEq.filter((r) => passesSection(textCell(r, "manufacturing_section"), filters));
  const machineNames = new Set(eq.map((r) => textCell(r, "equipment_name")));
  const av = tableRows(data, "availability_scenarios").filter((r) => machineNames.has(textCell(r, "equipment_name")));
  const watch = eq.filter((r) => textCell(r, "priority").startsWith("Watch")).length;
  const high = eq.filter((r) => textCell(r, "priority").startsWith("High")).length;
  const sig = eq.filter((r) => numberCell(r, "ratio_ci_low") > 1).length;
  const sorted = [...eq].sort((a, b) => numberCell(b, "standardised_ratio") - numberCell(a, "standardised_ratio"));
  const lows = [...av].sort((a, b) => numberCell(a, "availability_if_repair_8h") - numberCell(b, "availability_if_repair_8h")).slice(0, 6);
  const low = lows[0];
  const meanAv = sum(av.map((r) => numberCell(r, "availability_if_repair_8h"))) / av.length;
  return (
    <Page title="Equipment health" status={high ? { tone: "bad", text: "Action needed" } : watch ? { tone: "warn", text: "Watch list" } : { tone: "good", text: "Healthy" }}>
      <FilterNotice>Machine figures follow the section filter. The failure-by-section chart always shows every section, so you can compare them.</FilterNotice>
      <Kpis>
        <Kpi label="Machines" value={String(eq.length)} tone="accent" />
        <Kpi label="High priority" value={String(high)} ring={{ value: high / eq.length }} tone={high ? "bad" : "good"} />
        <Kpi label="On watch" value={String(watch)} ring={{ value: watch / eq.length }} tone={watch ? "warn" : "good"} />
        <Kpi label="Average uptime (8h repair)" value={`${formatNumber(meanAv * 100, 1)}%`} ring={{ value: meanAv }} tone="good" />
        <Kpi label="Lowest uptime" value={`${formatNumber(numberCell(low, "availability_if_repair_8h") * 100, 0)}%`} sub={short(textCell(low, "equipment_name"), 22)} tone="warn" />
      </Kpis>
      <Charts cols={1}><Panel title="Failures vs expected, with 95% range (line = as expected)" h={400}><Forest rows={sorted.map((r) => ({ name: short(textCell(r, "equipment_name")), value: numberCell(r, "standardised_ratio"), lo: numberCell(r, "ratio_ci_low"), hi: numberCell(r, "ratio_ci_high"), tone: numberCell(r, "ratio_ci_low") > 1 ? "bad" : numberCell(r, "standardised_ratio") > 1 ? "warn" : "accent" }))} /></Panel></Charts>
      <Charts cols={3}>
        <Panel title="Machines by priority"><Donut data={[{ name: "High", value: high }, { name: "Watch", value: watch }, { name: "Standard", value: eq.length - high - watch }]} center={String(eq.length)} /></Panel>
        <Panel title={`${short(textCell(low, "equipment_name"), 28)}: uptime by repair time, %`}><Bars data={[{ name: "2-hour repair", value: Number((numberCell(low, "availability_if_repair_2h") * 100).toFixed(1)) }, { name: "8-hour repair", value: Number((numberCell(low, "availability_if_repair_8h") * 100).toFixed(1)) }, { name: "24-hour repair", value: Number((numberCell(low, "availability_if_repair_24h") * 100).toFixed(1)) }]} fmt={pct} colorOf={(d) => (d.value < 90 ? palette.bad : d.value < 97 ? palette.warn : palette.good)} /></Panel>
        <Panel title="Failures by section"><Bars horizontal data={[...new Set(allEq.map((r) => textCell(r, "manufacturing_section")))].map((sec) => ({ name: sec, value: sum(allEq.filter((r) => textCell(r, "manufacturing_section") === sec).map((r) => numberCell(r, "failures"))) }))} fmt={formatInteger} /></Panel>
      </Charts>
      <Charts cols={1}><Panel title="Uptime by repair time, lowest six machines" h={260}><GroupedBars data={lows.map((r) => ({ name: `M${textCell(r, "equipment_id").slice(-3)}`, "2h": Number((numberCell(r, "availability_if_repair_2h") * 100).toFixed(1)), "8h": Number((numberCell(r, "availability_if_repair_8h") * 100).toFixed(1)), "24h": Number((numberCell(r, "availability_if_repair_24h") * 100).toFixed(1)) }))} keys={[{ key: "2h", name: "2h" }, { key: "8h", name: "8h" }, { key: "24h", name: "24h" }]} fmt={pct} /></Panel></Charts>
      <Insights items={[{ tag: "Signal", tone: sig ? "bad" : "good", text: sig ? `${sig} machines fail significantly above expected.` : "No machine is significantly above expected." }]} />
    </Page>
  );
}

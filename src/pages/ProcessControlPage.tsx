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

export function ProcessControlPage({ data }: { data: DashboardData }) {
  const { filters } = useFilters();
  const caps = tableRows(data, "capability").filter((r) => passesSection(textCell(r, "manufacturing_section"), filters));
  const lim = tableRows(data, "within_limits");
  const by = [...caps].sort((a, b) => numberCell(a, "cpk") - numberCell(b, "cpk"));
  const worst = by[0], best = by[by.length - 1];
  const capable = caps.filter((r) => numberCell(r, "cpk") >= targets.cpk).length;
  const isVar = (r: Record<string, unknown>) => textCell(r as never, "variable").endsWith("variance");
  const mean = (rs: typeof lim) => sum(rs.map((r) => numberCell(r, "share_within_limits"))) / Math.max(1, rs.length);
  const avgIn = mean(lim.filter((r) => !isVar(r))), varIn = mean(lim.filter(isVar));
  const gap = numberCell(worst, "cp") - numberCell(worst, "cpk");
  return (
    <Page title="Process control" status={capable === caps.length ? { tone: "good", text: "Capable" } : { tone: "bad", text: "Not capable" }}>
      <FilterNotice>Capability follows the section filter. The control-limit checks are full-period and do not change.</FilterNotice>
      <Kpis>
        <Kpi label="Sections capable" value={`${capable}/${caps.length}`} ring={{ value: capable / caps.length }} tone={capable ? "good" : "bad"} />
        <Kpi label="Worst Cpk" value={formatNumber(numberCell(worst, "cpk"), 2)} sub={textCell(worst, "manufacturing_section")} tone="bad" />
        <Kpi label="Best Cpk" value={formatNumber(numberCell(best, "cpk"), 2)} sub={textCell(best, "manufacturing_section")} tone="warn" />
        <Kpi label="Averages inside limits" value={`${formatNumber(avgIn * 100, 1)}%`} ring={{ value: avgIn }} tone="good" />
        <Kpi label="Variance inside limits" value={`${formatNumber(varIn * 100, 1)}%`} ring={{ value: varIn }} tone="warn" />
      </Kpis>
      <section className="x-charts x-c4">
        {caps.map((r) => { const v = numberCell(r, "cpk"); return (
          <div key={textCell(r, "manufacturing_section")} className="x-card x-gauge"><Ring value={v / targets.cpk} target={1} tone={v >= targets.cpk ? "good" : v >= 1 ? "warn" : "bad"} size={120} text={formatNumber(v, 2)} /><span>{textCell(r, "manufacturing_section")}</span></div>); })}
      </section>
      <Charts cols={3}>
        <Panel title="Spread vs centring (Cp, Cpk)"><GroupedBars data={caps.map((r) => ({ name: short(textCell(r, "manufacturing_section"), 11), Cp: Number(numberCell(r, "cp").toFixed(2)), Cpk: Number(numberCell(r, "cpk").toFixed(2)) }))} keys={[{ key: "Cp", name: "Cp" }, { key: "Cpk", name: "Cpk" }]} fmt={(v) => formatNumber(v, 2)} /></Panel>
        <Panel title="Out of spec, %"><Bars data={by.map((r) => ({ name: short(textCell(r, "manufacturing_section"), 11), value: Number((numberCell(r, "share_out_of_spec") * 100).toFixed(1)) }))} fmt={pct} colorOf={(d) => (d.value > 2 ? palette.bad : palette.warn)} /></Panel>
        <Panel title="Readings outside control limits, %"><Bars horizontal data={lim.map((r) => ({ name: textCell(r, "variable"), value: Number(((1 - numberCell(r, "share_within_limits")) * 100).toFixed(1)) }))} fmt={pct} colorOf={(d) => (d.value > 1 ? palette.warn : palette.good)} /></Panel>
      </Charts>
      <Insights items={[{ tag: "Risk", tone: "bad", text: `${textCell(worst, "manufacturing_section")} at ${formatNumber(numberCell(worst, "cpk"), 2)}: ${gap < 0.05 ? "too much variation, not centring" : "off-centre"}.` }, { tag: "Opportunity", tone: "accent", text: `${textCell(best, "manufacturing_section")} is closest to target.` }]} />
    </Page>
  );
}

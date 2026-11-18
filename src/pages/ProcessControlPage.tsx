import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatInteger, formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { targets } from "../lib/targets";
import { Bars, Charts, Insights, Kpi, Kpis, Page, Panel } from "../components/Exec";
const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);
const pct = (v: number) => `${formatNumber(v, 1)}%`;

export function ProcessControlPage({ data }: { data: DashboardData }) {
  const caps = tableRows(data, "capability");
  const lim = tableRows(data, "within_limits");
  const by = [...caps].sort((a, b) => numberCell(a, "cpk") - numberCell(b, "cpk"));
  const worst = by[0];
  const best = by[by.length - 1];
  const capable = caps.filter((r) => numberCell(r, "cpk") >= targets.cpk).length;
  const ooc = sum(lim.map((r) => numberCell(r, "readings_out_of_control")));
  const gap = numberCell(worst, "cp") - numberCell(worst, "cpk");
  return (
    <Page title="Process control" status={capable === caps.length ? { tone: "good", text: "Capable" } : { tone: "bad", text: "Not capable" }}>
      <Kpis>
        <Kpi label="Sections capable" value={`${capable}/${caps.length}`} sub={`Cpk ${targets.cpk}`} tone={capable ? "good" : "bad"} />
        <Kpi label="Worst Cpk" value={formatNumber(numberCell(worst, "cpk"), 2)} sub={textCell(worst, "manufacturing_section")} tone="bad" />
        <Kpi label="Best Cpk" value={formatNumber(numberCell(best, "cpk"), 2)} sub={textCell(best, "manufacturing_section")} tone="warn" />
        <Kpi label="Out-of-control readings" value={formatInteger(ooc)} tone="accent" />
      </Kpis>
      <Charts>
        <Panel title="Cpk by section"><Bars data={by.map((r) => ({ name: textCell(r, "manufacturing_section"), value: Number(numberCell(r, "cpk").toFixed(2)) }))} fmt={(v) => formatNumber(v, 2)} refValue={targets.cpk} colorOf={(d) => (d.value >= targets.cpk ? palette.good : palette.bad)} /></Panel>
        <Panel title="Out of spec, %"><Bars data={by.map((r) => ({ name: textCell(r, "manufacturing_section"), value: Number((numberCell(r, "share_out_of_spec") * 100).toFixed(1)) }))} fmt={pct} colorOf={(d) => (d.value > 2 ? palette.bad : palette.warn)} /></Panel>
      </Charts>
      <Insights items={[{ tag: "Risk", tone: "bad", text: `${textCell(worst, "manufacturing_section")} at ${formatNumber(numberCell(worst, "cpk"), 2)}: ${gap < 0.05 ? "too much variation, not centring" : "off-centre"}.` }, { tag: "Opportunity", tone: "accent", text: `${textCell(best, "manufacturing_section")} is closest to target.` }]} />
    </Page>
  );
}

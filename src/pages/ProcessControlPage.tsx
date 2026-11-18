import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatFraction, formatInteger, formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { targets } from "../lib/targets";
import { Bars, Findings, Grid, Kpi, Kpis, Page, Panel, Pill, Plot, Section, TableCard, type Finding } from "../components/Dash";
import type { ColumnSpec } from "../components/DataTable";

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

const capabilityColumns: ColumnSpec[] = [
  { key: "manufacturing_section", label: "Section" },
  { key: "n", label: "Readings", align: "right", format: (v) => formatInteger(Number(v)) },
  { key: "mean", label: "Mean", align: "right", format: (v) => formatNumber(Number(v), 2) },
  { key: "sd", label: "Spread (SD)", align: "right", format: (v) => formatNumber(Number(v), 2) },
  { key: "cp", label: "Cp", align: "right", format: (v) => formatNumber(Number(v), 2) },
  { key: "cpk", label: "Cpk", align: "right", format: (v) => formatNumber(Number(v), 2) },
  { key: "share_out_of_spec", label: "Out of spec", align: "right", format: (v) => formatFraction(Number(v), 1) },
  { key: "meets", label: "Meets target?" },
];

const limitColumns: ColumnSpec[] = [
  { key: "manufacturing_section", label: "Section" },
  { key: "variable", label: "Measurement" },
  { key: "baseline_n", label: "Baseline readings", align: "right", format: (v) => formatInteger(Number(v)) },
  { key: "mean", label: "Mean", align: "right", format: (v) => formatNumber(Number(v), 2) },
  { key: "sd", label: "SD", align: "right", format: (v) => formatNumber(Number(v), 2) },
  { key: "lcl", label: "Lower limit", align: "right", format: (v) => formatNumber(Number(v), 2) },
  { key: "ucl", label: "Upper limit", align: "right", format: (v) => formatNumber(Number(v), 2) },
];

export function ProcessControlPage({ data }: { data: DashboardData }) {
  const caps = tableRows(data, "capability");
  const lim = tableRows(data, "within_limits");
  const sorted = [...caps].sort((a, b) => numberCell(a, "cpk") - numberCell(b, "cpk"));
  const worst = sorted[0];
  const best = sorted[sorted.length - 1];
  const capable = caps.filter((r) => numberCell(r, "cpk") >= targets.cpk).length;
  const ooc = sum(lim.map((r) => numberCell(r, "readings_out_of_control")));
  const gap = numberCell(worst, "cp") - numberCell(worst, "cpk");
  const cpkBars = sorted.map((r) => ({ name: textCell(r, "manufacturing_section"), value: Number(numberCell(r, "cpk").toFixed(2)) }));
  const outOfSpec = sorted.map((r) => ({ name: textCell(r, "manufacturing_section"), value: Number((numberCell(r, "share_out_of_spec") * 100).toFixed(1)) }));
  const withinLimits = lim.map((r) => ({ name: textCell(r, "variable").split("_").join(" "), value: Number((numberCell(r, "share_within_limits") * 100).toFixed(2)) }));

  const findings: Finding[] = [
    { tag: "Risk", tone: "bad", text: `${textCell(worst, "manufacturing_section")} is at Cpk ${formatNumber(numberCell(worst, "cpk"), 2)}: ${gap < 0.05 ? "too much variation, not just off-centre" : "off-centre"}.` },
    { tag: "Target", tone: capable === caps.length ? "good" : "bad", text: `${capable} of ${caps.length} sections reach the Cpk target of ${formatNumber(targets.cpk, 2)}.` },
    { tag: "Strength", tone: "good", text: `${textCell(best, "manufacturing_section")} is closest to target, at Cpk ${formatNumber(numberCell(best, "cpk"), 2)}.` },
  ];

  return (
    <Page
      eyebrow="Quality and production"
      title="Process control"
      question="Are the measured process values stable, and do sections meet the capability target?"
      status={capable === caps.length ? { tone: "good", text: "Capable" } : { tone: "bad", text: "Not capable" }}
      questionIds={["process"]}
    >
      <Kpis>
        <Kpi tone={capable ? "good" : "bad"} label="Sections meeting target" value={`${capable} of ${caps.length}`} caption={`Cpk ${formatNumber(targets.cpk, 2)} or better`} />
        <Kpi tone="bad" label="Worst Cpk" value={formatNumber(numberCell(worst, "cpk"), 2)} caption={textCell(worst, "manufacturing_section")} />
        <Kpi tone="warn" label="Best Cpk" value={formatNumber(numberCell(best, "cpk"), 2)} caption={textCell(best, "manufacturing_section")} />
        <Kpi tone="accent" label="Readings out of control" value={formatInteger(ooc)} caption="outside control limits" />
      </Kpis>

      <Section title="Key points">
        <Findings items={findings} />
      </Section>

      <Section title="Charts" note="Capability, out-of-spec share and stability, by section and measurement.">
        <Grid cols={3}>
          <Panel title="Cpk by section" note={`Green bars meet the ${formatNumber(targets.cpk, 2)} target.`}>
            <Plot>
              <Bars data={cpkBars} fmt={(v) => formatNumber(v, 2)} refValue={targets.cpk} colorOf={(d) => (d.value >= targets.cpk ? palette.good : palette.bad)} />
            </Plot>
          </Panel>
          <Panel title="Out of spec, %" note="Share of readings outside the specification.">
            <Plot>
              <Bars data={outOfSpec} fmt={(v) => `${formatNumber(v, 1)}%`} colorOf={(d) => (d.value > 2 ? palette.bad : palette.warn)} />
            </Plot>
          </Panel>
          <Panel title="Readings within control limits, %" note="Higher is more stable. Measurements below 100% have out-of-control readings.">
            <Plot>
              <Bars data={withinLimits} fmt={(v) => `${formatNumber(v, 2)}%`} colorOf={() => palette.accent} />
            </Plot>
          </Panel>
        </Grid>
      </Section>

      <Section title="Detail">
        <TableCard
          title="Capability by section"
          note="Cp shows the spread against the specification; Cpk also checks whether the process is centred."
          rows={caps.map((r) => ({ ...r, meets: numberCell(r, "cpk") >= targets.cpk ? "Yes" : "No" }))}
          columns={capabilityColumns}
          fileName="capability-by-section.csv"
          pageSize={10}
          renderCell={(column, row) => (column.key === "meets" ? <Pill tone={textCell(row, "meets") === "Yes" ? "good" : "bad"}>{textCell(row, "meets")}</Pill> : undefined)}
        />
        <TableCard title="Control limits" note="Limits from the baseline period. A reading outside them signals the process changed." rows={tableRows(data, "control_limits")} columns={limitColumns} fileName="control-limits.csv" pageSize={10} />
      </Section>
    </Page>
  );
}

import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatFraction, formatInteger, formatNumber, formatPercent } from "../lib/format";
import { palette } from "../lib/palette";
import { Bars, Findings, Grid, Kpi, Kpis, Page, Panel, Pill, Plot, Section, TableCard, type Finding, type Tone } from "../components/Dash";
import type { ColumnSpec } from "../components/DataTable";

const priorityTone: Record<string, Tone> = { High: "bad", Watch: "warn", Standard: "neutral" };

const reliabilityColumns: ColumnSpec[] = [
  { key: "equipment_name", label: "Machine" },
  { key: "manufacturing_section", label: "Section" },
  { key: "batches", label: "Batches", align: "right", format: (v) => formatInteger(Number(v)) },
  { key: "failures", label: "Failures", align: "right", format: (v) => formatInteger(Number(v)) },
  { key: "failure_rate", label: "Failure rate", align: "right", format: (v) => formatPercent(Number(v) * 100, 2) },
  { key: "standardised_ratio", label: "Versus expected", align: "right", format: (v) => formatNumber(Number(v), 2) },
  { key: "priority", label: "Priority" },
];

const uptimeColumns: ColumnSpec[] = [
  { key: "equipment_name", label: "Machine" },
  { key: "availability_if_repair_2h", label: "Uptime, 2h repair", align: "right", format: (v) => formatFraction(Number(v), 1) },
  { key: "availability_if_repair_8h", label: "Uptime, 8h repair", align: "right", format: (v) => formatFraction(Number(v), 1) },
  { key: "availability_if_repair_24h", label: "Uptime, 24h repair", align: "right", format: (v) => formatFraction(Number(v), 1) },
];

export function EquipmentPage({ data }: { data: DashboardData }) {
  const eq = tableRows(data, "equipment_reliability");
  const av = tableRows(data, "availability_scenarios");
  const watch = eq.filter((r) => textCell(r, "priority").startsWith("Watch")).length;
  const high = eq.filter((r) => textCell(r, "priority").startsWith("High")).length;
  const sig = eq.filter((r) => numberCell(r, "ratio_ci_low") > 1).length;
  const short = (n: string) => (n.length > 30 ? `${n.slice(0, 29)}…` : n);
  const ratios = [...eq].sort((a, b) => numberCell(b, "standardised_ratio") - numberCell(a, "standardised_ratio")).map((r) => ({ name: short(textCell(r, "equipment_name")), value: Number(numberCell(r, "standardised_ratio").toFixed(2)) }));
  const uptime = [...av].sort((a, b) => numberCell(a, "availability_if_repair_8h") - numberCell(b, "availability_if_repair_8h"));
  const low = uptime[0];
  const uptimeChart = uptime.map((r) => ({ name: short(textCell(r, "equipment_name")), value: Number((numberCell(r, "availability_if_repair_8h") * 100).toFixed(1)) }));

  const findings: Finding[] = [
    { tag: "Signal", tone: sig ? "bad" : "good", text: sig ? `${sig} machines fail significantly more often than expected.` : "No machine fails significantly more often than expected." },
    { tag: "Uptime", tone: "warn", text: low ? `${short(textCell(low, "equipment_name"))} has the lowest uptime if repairs take 8 hours: ${formatFraction(numberCell(low, "availability_if_repair_8h"), 1)}.` : "No uptime data." },
    { tag: "Priority", tone: high ? "bad" : watch ? "warn" : "good", text: `${high} high priority and ${watch} on watch, out of ${eq.length} machines.` },
  ];

  return (
    <Page
      eyebrow="Quality and production"
      title="Equipment health"
      question="Which machines fail more often than expected?"
      status={high ? { tone: "bad", text: "Action needed" } : watch ? { tone: "warn", text: "Watch list" } : { tone: "good", text: "Healthy" }}
      questionIds={["equipment"]}
    >
      <Kpis>
        <Kpi tone="accent" label="Machines" value={String(eq.length)} caption="in the reliability review" />
        <Kpi tone={high ? "bad" : "good"} label="High priority" value={String(high)} caption="act first" />
        <Kpi tone={watch ? "warn" : "good"} label="On watch" value={String(watch)} caption="monitor and review" />
        <Kpi tone={sig ? "bad" : "good"} label="Significantly above expected" value={String(sig)} caption="interval entirely above 1.0" />
        <Kpi tone="warn" label="Lowest uptime, 8h repairs" value={low ? formatFraction(numberCell(low, "availability_if_repair_8h"), 1) : "-"} caption={low ? short(textCell(low, "equipment_name")) : ""} />
      </Kpis>

      <Section title="Key points">
        <Findings items={findings} />
      </Section>

      <Section title="Charts" note="Failures compared with what the batch count would predict, and uptime under a typical repair time.">
        <Grid cols={2}>
          <Panel title="Failures versus expected" note="1.0 means failures are as expected. Above 1.0 means more failures than expected.">
            <Plot tall>
              <Bars horizontal data={ratios} fmt={(v) => formatNumber(v, 2)} refValue={1} colorOf={(d) => (d.value > 1 ? palette.warn : palette.muted)} />
            </Plot>
          </Panel>
          <Panel title="Uptime with an 8-hour repair, %" note="Share of time each machine is available, based on the failure rate and an 8-hour repair.">
            <Plot tall>
              <Bars horizontal data={uptimeChart} fmt={(v) => `${formatNumber(v, 1)}%`} colorOf={(d) => (d.value < 95 ? palette.warn : palette.good)} />
            </Plot>
          </Panel>
        </Grid>
      </Section>

      <Section title="Detail">
        <TableCard
          title="Reliability by machine"
          note="Priority combines how far a machine is above expected with how certain that gap is."
          rows={eq}
          columns={reliabilityColumns}
          fileName="equipment-reliability.csv"
          pageSize={13}
          renderCell={(column, row) => (column.key === "priority" ? <Pill tone={priorityTone[textCell(row, "priority").split(" ")[0]] ?? "neutral"}>{textCell(row, "priority")}</Pill> : undefined)}
        />
        <TableCard title="Uptime by repair time" note="How much of the time each machine would be available for different repair times." rows={av} columns={uptimeColumns} fileName="equipment-uptime.csv" pageSize={13} />
      </Section>
    </Page>
  );
}

import { Factory, Gauge, Timer, Wrench } from "lucide-react";
import { CartesianGrid, Legend, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../components/Card";
import { DataTable, type ColumnSpec } from "../components/DataTable";
import { IntervalPlot, type IntervalItem } from "../components/IntervalPlot";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { Section } from "../components/Section";
import { SectionSummary } from "../components/SectionSummary";
import { StatusPill } from "../components/StatusPill";
import { useFilters } from "../components/FilterContext";
import { FilterNotice } from "../components/FilterNotice";
import { ALL } from "../lib/filters";
import { type DashboardData, numberCell, tableRows, textCell, type Row } from "../lib/data";
import { formatFraction, formatInteger, formatNumber } from "../lib/format";
import { axisProps, gridProps, tooltipContentStyle } from "../lib/chart";
import { palette, priorityColour } from "../lib/palette";

const toneForPriority: Record<string, "bad" | "warn" | "neutral"> = { High: "bad", Watch: "warn", Standard: "neutral" };

/** Equipment page: which machines fail more than expected, and how maintenance status affects failure odds. */
export function EquipmentPage({ data }: { data: DashboardData }) {
  const { filters } = useFilters();
  const allEquipment = tableRows(data, "equipment_reliability");
  const equipment = filters.section === ALL ? allEquipment : allEquipment.filter((row) => textCell(row, "manufacturing_section") === filters.section);
  const priorityOf = (row: Row) => textCell(row, "priority").split(":")[0];
  const countByPriority = (level: string) => equipment.filter((row) => priorityOf(row) === level).length;
  const highCount = countByPriority("High");
  const watchCount = countByPriority("Watch");
  const standardCount = countByPriority("Standard");

  const logit = tableRows(data, "maintenance_logit");
  const oddsItems: IntervalItem[] = logit
    .filter((row) => textCell(row, "term") !== "Intercept")
    .map((row) => ({
      label: textCell(row, "term"),
      value: numberCell(row, "odds_ratio"),
      low: numberCell(row, "or_ci_low"),
      high: numberCell(row, "or_ci_high"),
    }));
  const critical = logit.find((row) => textCell(row, "term") === "Maintenance: Critical") ?? {};
  const dueSoon = logit.find((row) => textCell(row, "term") === "Maintenance: Due Soon") ?? {};

  const scatterPoints = (level: string) =>
    equipment
      .filter((row) => priorityOf(row) === level)
      .map((row) => ({
        name: textCell(row, "equipment_name"),
        expected: numberCell(row, "expected_failures"),
        observed: numberCell(row, "failures"),
      }));
  const maxAxis = Math.max(1, ...equipment.map((row) => Math.max(numberCell(row, "expected_failures"), numberCell(row, "failures"))));

  const topRatio = [...equipment]
    .sort((first, second) => numberCell(second, "standardised_ratio") - numberCell(first, "standardised_ratio"))
    .slice(0, 12);
  const machineColumns: ColumnSpec[] = [
    { key: "equipment_id", label: "Machine (masked)" },
    { key: "equipment_name", label: "Name" },
    { key: "manufacturing_section", label: "Section" },
    { key: "batches", label: "Batches", align: "right", format: (value) => formatInteger(Number(value)) },
    { key: "failures", label: "Failures", align: "right", format: (value) => formatInteger(Number(value)) },
    { key: "standardised_ratio", label: "Observed / expected", align: "right", format: (value) => formatNumber(Number(value), 2) },
    { key: "priority", label: "Priority" },
  ];

  const availability = tableRows(data, "availability_scenarios");

  return (
    <>
      <PageHeader questions={["equipment"]}
        eyebrow="Equipment reliability"
        title="Machines that fail more than their peers"
        description="Batch failure is the proxy for equipment failure, because the data has no repair or downtime records. Each machine is compared with machines making the same product."
        aside={<StatusPill tone={highCount > 0 ? "bad" : "warn"}>{`${highCount} High priority`}</StatusPill>}
      />

      <FilterNotice>Machine counts, the scatter and the ratio table respond to the section filter. Dosage form and year are not stored per machine, and the odds ratios are full-period.</FilterNotice>

      <Section title="Priority at a glance" intro="Priority is set by a statistical test: a machine is flagged only when its excess failures are unlikely to be chance.">
        <KpiCard icon={Wrench} label="High priority machines" value={formatInteger(highCount)} hint="Machines to review first" tone={highCount > 0 ? "bad" : "good"} />
        <KpiCard icon={Gauge} label="Watch machines" value={formatInteger(watchCount)} hint="Above expected, interval includes 1" tone="warn" />
        <KpiCard icon={Factory} label="Standard machines" value={formatInteger(standardCount)} hint="Within the expected range" tone="neutral" />
        <KpiCard
          icon={Timer}
          label="Critical maintenance odds"
          value={`${formatNumber(numberCell(critical, "odds_ratio"), 2)}x`}
          hint={`After adjustment. Due Soon ${formatNumber(numberCell(dueSoon, "odds_ratio"), 2)}x, no clear effect`}
          tone="bad"
        />
      </Section>

      <div className="grid-2">
        <Card
          title="Observed against expected failures"
          subtitle="One dot per machine, coloured by priority"
          caption={`Dots above the dashed line fail more often than machines making the same product. This run has ${highCount} High and ${watchCount} Watch machines.`}
        >
          <div className="chart chart-tall">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 12, right: 20, left: 0, bottom: 12 }}>
                <CartesianGrid {...gridProps} vertical />
                <XAxis type="number" dataKey="expected" name="Expected" domain={[0, maxAxis]} {...axisProps} label={{ value: "Expected failures", position: "insideBottom", offset: -6, fill: palette.axis, fontSize: 12 }} />
                <YAxis type="number" dataKey="observed" name="Observed" domain={[0, maxAxis]} {...axisProps} width={44} label={{ value: "Observed failures", angle: -90, position: "insideLeft", fill: palette.axis, fontSize: 12 }} />
                <Tooltip contentStyle={tooltipContentStyle} cursor={{ strokeDasharray: "3 3" }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <ReferenceLine segment={[{ x: 0, y: 0 }, { x: maxAxis, y: maxAxis }]} stroke={palette.accent} strokeDasharray="5 4" />
                {["High", "Watch", "Standard"].map((level) => (
                  <Scatter key={level} name={level} data={scatterPoints(level)} fill={priorityColour[level]} fillOpacity={0.85} />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          title="Adjusted odds ratios of batch failure"
          subtitle="Compared with Current maintenance and Tablet dosage"
          caption="Dots show the odds ratio and bars the 95% range; a range that crosses the dashed line of 1 shows no clear effect."
        >
          <IntervalPlot
            items={oddsItems}
            referenceValue={1}
            referenceLabel="No effect"
            logScale
            xLabel="Odds ratio (log scale)"
            valueFormat={(value) => formatNumber(value, 2)}
            ariaLabel="Adjusted odds ratios of batch failure with 95 percent intervals"
          />
        </Card>
      </div>

      <Card
        title="Machines with the highest observed-to-expected ratio"
        subtitle="Top twelve, ranked by ratio"
        caption="A ratio of 1.00 means a machine fails exactly as often as machines making the same product; the masked column keeps identities private."
      >
        <DataTable
          rows={topRatio}
          columns={machineColumns}
          fileName="equipment_top_ratio.csv"
          pageSize={6}
          searchKeys={["equipment_name", "manufacturing_section", "priority"]}
          renderCell={(column, row) =>
            column.key === "priority" ? (
              <StatusPill tone={toneForPriority[priorityOf(row)] ?? "neutral"}>{priorityOf(row)}</StatusPill>
            ) : undefined
          }
        />
      </Card>

      <Card
        title="Availability if repairs take longer"
        subtitle="Proxy availability under three repair times"
        caption="Availability is estimated from failure rate per production hour, so it is a scenario rather than a measured uptime."
      >
        <DataTable
          rows={availability}
          fileName="availability_scenarios.csv"
          pageSize={8}
          columns={[
            { key: "equipment_id", label: "Machine (masked)" },
            { key: "equipment_name", label: "Name" },
            { key: "proxy_hours_per_failure", label: "Hours per failure", align: "right", format: (value) => formatNumber(Number(value), 0) },
            { key: "availability_if_repair_2h", label: "2 h repair", align: "right", format: (value) => formatFraction(Number(value), 1) },
            { key: "availability_if_repair_8h", label: "8 h repair", align: "right", format: (value) => formatFraction(Number(value), 1) },
            { key: "availability_if_repair_24h", label: "24 h repair", align: "right", format: (value) => formatFraction(Number(value), 1) },
          ]}
        />
      </Card>

      <SectionSummary
        points={[
          `Critical maintenance raises failure odds to ${formatNumber(numberCell(critical, "odds_ratio"), 2)} times Current, with a range of ${formatNumber(numberCell(critical, "or_ci_low"), 2)} to ${formatNumber(numberCell(critical, "or_ci_high"), 2)}.`,
          `Due Soon shows odds ratio ${formatNumber(numberCell(dueSoon, "odds_ratio"), 2)}, and its range includes 1, so there is no clear effect.`,
          `Machines by priority: ${highCount} High, ${watchCount} Watch, ${standardCount} Standard.`,
          "Small machines have wide intervals, so read their ratios with caution.",
        ]}
      />
    </>
  );
}

import { useMemo, useState } from "react";
import { Activity, CheckCircle2, Gauge, Layers } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { IntervalPlot, type IntervalItem } from "../components/IntervalPlot";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { Section } from "../components/Section";
import { SectionSummary } from "../components/SectionSummary";
import { type DashboardData, numberCell, tableRows, textCell, type Row } from "../lib/data";
import { formatFraction, formatNumber } from "../lib/format";
import { axisProps, gridProps, tooltipContentStyle } from "../lib/chart";
import { palette } from "../lib/palette";
import { useFilters } from "../components/FilterContext";
import { FilterNotice } from "../components/FilterNotice";
import { targets } from "../lib/targets";

/** Process-control page: control limits, drift in variance, assay capability and the early-warning test. */
export function ProcessControlPage({ data }: { data: DashboardData }) {
  const { summary } = data;
  const withinRows = tableRows(data, "within_limits");
  const within = (variable: string) => numberCell(withinRows.find((row) => textCell(row, "variable") === variable) ?? {}, "share_within_limits");
  const varianceVariables = ["temp_variance", "pressure_variance"];
  const averageVariables = withinRows.map((row) => textCell(row, "variable")).filter((name) => !varianceVariables.includes(name));
  const meanOf = (names: string[]) => names.reduce((total, name) => total + within(name), 0) / Math.max(1, names.length);
  const averageInside = meanOf(averageVariables);
  const varianceInside = meanOf(varianceVariables);

  const { filters } = useFilters();
  const sectionMatch = (row: Row) => filters.sections.length === 0 || filters.sections.includes(textCell(row, "manufacturing_section"));
  const capability = tableRows(data, "capability").filter(sectionMatch);
  const capableCount = capability.filter((row) => Boolean(row.capable_at_1_33)).length;
  const leadRows = tableRows(data, "lead_time_signal");
  const failedLead = leadRows.find((row) => textCell(row, "outcome") === "Failed") ?? {};

  const [variable, setVariable] = useState("temp_avg");
  const controlRows = tableRows(data, "control_limits").filter(sectionMatch);
  const variables = [...new Set(controlRows.map((row) => textCell(row, "variable")))];
  const limitItems: IntervalItem[] = useMemo(
    () =>
      controlRows
        .filter((row) => textCell(row, "variable") === variable)
        .map((row) => ({
          label: textCell(row, "manufacturing_section"),
          value: numberCell(row, "mean"),
          low: numberCell(row, "lcl"),
          high: numberCell(row, "ucl"),
        })),
    [controlRows, variable],
  );

  const withinChart = withinRows.map((row) => ({
    name: textCell(row, "variable").replace(/_/g, " "),
    share: numberCell(row, "share_within_limits") * 100,
    variance: varianceVariables.includes(textCell(row, "variable")),
  }));
  const capabilityChart = capability.map((row) => ({
    section: textCell(row, "manufacturing_section"),
    cpk: numberCell(row, "cpk"),
    capable: Boolean(row.capable_at_1_33),
  }));

  return (
    <>
      <PageHeader questions={["process"]}
        eyebrow="Process control"
        title="Are the process readings staying in control?"
        description="Control limits are set at three standard deviations from passed batches up to 2021, so drift after that cannot widen them and hide itself."
        aside={<span className="glass-chip">Limits from passed batches, 2007 to 2021</span>}
      />

      <FilterNotice>Control limits, capability and the section charts respond to the section filter. Limits are fixed on passed batches up to 2021, so the year and dosage filters do not change them.</FilterNotice>

      <Section title="Control at a glance" intro="Share of readings inside their control limits, and the capability and early-warning checks.">
        <KpiCard icon={Activity} label="Average readings in control" value={formatFraction(averageInside, 1)} hint="Temperature, pressure and humidity means" tone="good" />
        <KpiCard icon={Layers} label="Variance readings in control" value={formatFraction(varianceInside, 1)} hint="Variance drifts out of control more often" tone="warn" />
        <KpiCard icon={Gauge} label="Sections meeting Cpk 1.33" value={`${capableCount} of ${capability.length}`} hint="Against the assumed 95 to 105 percent specification" tone={capableCount === capability.length ? "good" : "bad"} />
        <KpiCard
          icon={CheckCircle2}
          label="Early-warning relative risk"
          value={formatNumber(numberCell(failedLead, "relative_risk_of_prior_signal"), 2)}
          hint="Prior out-of-control reading before failure. 1.00 means no warning"
          tone="info"
        />
      </Section>

      <div className="grid-2">
        <Card
          title="Readings inside control limits"
          subtitle="Share of batches within limits, by process variable"
          caption="Variance readings leave their limits more often than average readings; the axis starts at 95 percent to show the gaps."
        >
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={withinChart} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="name" {...axisProps} tick={{ fontSize: 11, fill: palette.axis }} />
                <YAxis {...axisProps} domain={[95, 100]} tickFormatter={(value: number) => `${value}%`} width={48} />
                <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => `${formatNumber(Number(value), 2)}%`} />
                <Bar dataKey="share" name="Within limits" radius={[8, 8, 0, 0]} maxBarSize={56}>
                  {withinChart.map((entry) => (
                    <Cell key={entry.name} fill={entry.variance ? palette.warn : palette.accent} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card
          title="Assay capability by section (Cpk)"
          subtitle="Against the 1.33 target"
          caption="Green-tone bars meet the target; the specification used is an assumption that still needs confirming."
        >
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={capabilityChart} margin={{ top: 12, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="section" {...axisProps} tick={{ fontSize: 11, fill: palette.axis }} />
                <YAxis {...axisProps} width={40} />
                <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => formatNumber(Number(value), 2)} />
                <ReferenceLine y={targets.cpk} stroke={palette.bad} strokeDasharray="5 4" label={{ value: "Target 1.33", fill: palette.bad, fontSize: 12, position: "insideTopRight" }} />
                <Bar dataKey="cpk" name="Cpk" radius={[8, 8, 0, 0]} maxBarSize={56}>
                  {capabilityChart.map((entry) => (
                    <Cell key={entry.section} fill={entry.capable ? palette.good : palette.bad} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card
        title="Control limits by section"
        subtitle="Mean, with lower and upper control limits"
        actions={
          <label className="select-wrap">
            <span className="visually-hidden">Choose a variable</span>
            <select value={variable} onChange={(event) => setVariable(event.target.value)}>
              {variables.map((name) => (
                <option key={name} value={name}>
                  {name.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
        }
        caption="Each bar runs from the lower to the upper control limit, and the dot marks the mean; a reading outside the bar is out of control."
      >
        <IntervalPlot
          items={limitItems}
          xLabel={variable.replace(/_/g, " ")}
          valueFormat={(value) => formatNumber(value, 2)}
          ariaLabel={`Control limits for ${variable} by manufacturing section`}
        />
      </Card>

      <Card title="Control-limit table" subtitle="Every variable and section" caption="Limits are computed from the passed batches before 2022; the table can be exported for the QA file.">
        <DataTable
          rows={controlRows}
          fileName="control_limits.csv"
          pageSize={8}
          columns={[
            { key: "manufacturing_section", label: "Section" },
            { key: "variable", label: "Variable" },
            { key: "baseline_n", label: "Baseline batches", align: "right", format: (value) => formatNumber(Number(value), 0) },
            { key: "mean", label: "Mean", align: "right", format: (value) => formatNumber(Number(value), 2) },
            { key: "sd", label: "SD", align: "right", format: (value) => formatNumber(Number(value), 2) },
            { key: "lcl", label: "Lower limit", align: "right", format: (value) => formatNumber(Number(value), 2) },
            { key: "ucl", label: "Upper limit", align: "right", format: (value) => formatNumber(Number(value), 2) },
          ]}
        />
      </Card>

      <SectionSummary
        points={[
          `${formatFraction(averageInside, 1)} of average readings and ${formatFraction(varianceInside, 1)} of variance readings stay inside their limits.`,
          `A prior out-of-control reading on the same machine has relative risk ${formatNumber(numberCell(failedLead, "relative_risk_of_prior_signal"), 2)}, which is not a dependable warning.`,
          `${capableCount} of ${capability.length} sections reach a Cpk of 1.33 against the assumed specification.`,
          `Control limits use passed batches up to 2021, so later drift shows without moving the limits (run ${summary.rows.batches.toLocaleString("en-KE")} batches).`,
        ]}
      />
    </>
  );
}

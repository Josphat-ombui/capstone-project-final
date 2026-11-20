import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../components/Card";
import { DataTable, type ColumnSpec } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { Section } from "../components/Section";
import { SectionSummary } from "../components/SectionSummary";
import { StatusPill } from "../components/StatusPill";
import type { BoxStats, CategoryCount, DashboardData, ExploreData, Row } from "../lib/data";
import { tableRows, textCell } from "../lib/data";
import { formatInteger, formatNumber, formatPercent } from "../lib/format";
import { axisProps, gridProps, tooltipContentStyle } from "../lib/chart";
import { palette, seriesColours } from "../lib/palette";
import type { Tone } from "../components/KpiCard";

/** Plain labels for the batch measurements. Other names are shown as they are. */
const VARIABLE_LABELS: Record<string, string> = {
  temp_avg: "Average temperature",
  temp_variance: "Temperature variation",
  pressure_avg: "Average pressure",
  pressure_variance: "Pressure variation",
  humidity_avg: "Average humidity",
  equipment_age_years: "Equipment age (years)",
  maintenance_days_ago: "Days since maintenance",
  operator_experience_years: "Operator experience (years)",
  raw_material_quality: "Raw material quality",
  production_hours: "Production hours",
  batch_size: "Batch size",
};

/** Measurements shown as histograms: the ones with the clearest spread. */
const HISTOGRAM_NAMES = ["temp_avg", "pressure_avg", "humidity_avg", "equipment_age_years", "operator_experience_years", "batch_size"];

/** Category columns shown as bar charts. */
const CATEGORY_NAMES: { key: string; label: string }[] = [
  { key: "maintenance_status", label: "Maintenance status" },
  { key: "dosage_form", label: "Dosage form" },
  { key: "manufacturing_section", label: "Manufacturing section" },
  { key: "age_band", label: "Equipment age band" },
];

/** Colour for a correlation value: indigo for positive, rose for negative, white at zero. */
function correlationColour(value: number): string {
  const strength = Math.min(1, Math.abs(value));
  return value >= 0 ? `rgba(99, 102, 241, ${strength})` : `rgba(244, 63, 94, ${strength})`;
}

/** Position of a value on a 0 to 100 scale between two bounds. */
function scalePosition(value: number, low: number, high: number): number {
  return high === low ? 0 : ((value - low) / (high - low)) * 100;
}

/** One box plot row: whiskers, middle half and median, each on that variable's own scale. */
function BoxPlotRow({ label, stats }: { label: string; stats: BoxStats }) {
  const low = stats.min;
  const high = stats.max;
  const whiskerLeft = scalePosition(stats.whisker_low, low, high);
  const whiskerRight = scalePosition(stats.whisker_high, low, high);
  const boxLeft = scalePosition(stats.q1, low, high);
  const boxRight = scalePosition(stats.q3, low, high);
  const medianAt = scalePosition(stats.median, low, high);
  return (
    <div className="box-row">
      <span className="box-label">{label}</span>
      <div
        className="box-track"
        role="img"
        aria-label={`Box plot for ${label}: median ${formatNumber(stats.median, 2)}, middle half from ${formatNumber(stats.q1, 2)} to ${formatNumber(stats.q3, 2)}, whiskers from ${formatNumber(stats.whisker_low, 2)} to ${formatNumber(stats.whisker_high, 2)}, ${formatInteger(stats.outliers)} outliers`}
      >
        <span className="box-whisker" style={{ left: `${whiskerLeft}%`, width: `${whiskerRight - whiskerLeft}%` }} />
        <span className="box-iqr" style={{ left: `${boxLeft}%`, width: `${Math.max(boxRight - boxLeft, 0.5)}%` }} />
        <span className="box-median" style={{ left: `${medianAt}%` }} />
      </div>
      <span className="box-values">
        median {formatNumber(stats.median, 2)} · {formatInteger(stats.outliers)} outliers
      </span>
    </div>
  );
}

/** A small bar chart of batch counts for one category column, with failure rates in the tooltip. */
function CategoryChart({ title, rows }: { title: string; rows: CategoryCount[] }) {
  return (
    <Card title={title} subtitle="Number of batches in each group" caption="Taller bars mean more batches in that group. Read the failure rates under the chart before comparing groups.">
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="level" {...axisProps} interval={0} tick={{ fontSize: 11 }} />
            <YAxis {...axisProps} tickFormatter={(value) => formatInteger(Number(value))} />
            <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => [formatInteger(Number(value)), "Batches"]} />
            <Bar dataKey="batches" name="batches" radius={[6, 6, 0, 0]}>
              {rows.map((row, index) => (
                <Cell key={row.level} fill={seriesColours[index % seriesColours.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="muted small">
        Failure rate: {rows.map((row) => `${row.level} ${formatNumber(row.failure_rate_pct, 2)}%`).join(" · ")}
      </p>
    </Card>
  );
}

/** Correlation heatmap: one coloured cell per pair of measurements, with a colour legend. */
function CorrelationHeatmap({ explore }: { explore: ExploreData }) {
  const { columns, matrix } = explore.correlations;
  return (
    <Card title="Correlation heatmap" subtitle="How closely pairs of measurements move together" className="wide" caption="Dark indigo means the two move together, dark rose means they move in opposite directions, and pale cells mean little link.">
      <div className="heatmap-wrap">
        <table className="heatmap" aria-label="Correlation between batch measurements">
          <thead>
            <tr>
              <th scope="col" aria-label="Measurement" />
              {columns.map((column) => (
                <th key={column} scope="col" className="heatmap-head" title={column}>
                  {(VARIABLE_LABELS[column] ?? column).slice(0, 4)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((rowValues, rowIndex) => (
              <tr key={columns[rowIndex]}>
                <th scope="row" className="heatmap-label">
                  {VARIABLE_LABELS[columns[rowIndex]] ?? columns[rowIndex]}
                </th>
                {rowValues.map((value, colIndex) => (
                  <td key={colIndex} className="heatmap-cell" style={{ background: correlationColour(value) }} title={`${VARIABLE_LABELS[columns[rowIndex]] ?? columns[rowIndex]} and ${VARIABLE_LABELS[columns[colIndex]] ?? columns[colIndex]}: ${formatNumber(value, 3)}`}>
                    {formatNumber(value, 2)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="heatmap-legend" aria-hidden="true">
        <span>-1 (opposite)</span>
        <span className="heatmap-scale" />
        <span>+1 (together)</span>
      </div>
    </Card>
  );
}

/** Data exploration: distributions, categories, missing values, outliers, correlations, trend and data checks. */
export function ExplorationPage({ data }: { data: DashboardData }) {
  const explore = data.explore;
  if (!explore) {
    return (
      <>
        <PageHeader eyebrow="Data exploration" title="What the records look like" description="The exploration tables are not in the exported data." questions={["data-quality"]} />
        <p className="state-error">Run python scripts/export_dashboard_data.py to add the exploration statistics.</p>
      </>
    );
  }

  const qualityRows = tableRows(data, "quality_register");
  const missing = explore.missing_values.filter((row) => row.missing > 0).sort((first, second) => second.share_pct - first.share_pct);
  const missingChart = missing.map((row) => ({ name: row.column.replace(/_/g, " "), share: row.share_pct }));
  const trend = explore.monthly_trend.map((row) => ({ month: row.month, rate: row.failure_rate_pct }));
  const boxNames = Object.keys(explore.box_stats);
  const qualityColumns: ColumnSpec[] = [
    { key: "area", label: "Area" },
    { key: "check", label: "Check" },
    { key: "observed", label: "Observed", align: "right" },
    { key: "expected", label: "Expected", align: "right" },
    { key: "status", label: "Status" },
  ];
  const toneFor = (status: string): Tone => (status === "PASS" ? "good" : status === "INFO" ? "info" : "bad");
  const worstMissing = missing[0];
  const outlierLeader = boxNames
    .map((name) => ({ name: VARIABLE_LABELS[name] ?? name, outliers: explore.box_stats[name].outliers, n: explore.box_stats[name].n }))
    .reduce((best, item) => (item.outliers > best.outliers ? item : best), { name: "none", outliers: 0, n: 1 });
  const dosageRows = explore.category_counts.dosage_form ?? [];
  const highestDosage = dosageRows.reduce((best, row) => (row.failure_rate_pct > best.failure_rate_pct ? row : best), dosageRows[0] ?? { level: "none", batches: 0, failures: 0, failure_rate_pct: 0 });

  return (
    <>
      <PageHeader
        eyebrow="Data exploration"
        title="What the records look like"
        description={`${formatInteger(explore.batches_total)} batch records, checked for missing values, outliers, categories and trends before any model was fitted.`}
        questions={["data-quality"]}
      />

      <SectionSummary
        points={[
          `${formatInteger(qualityRows.filter((row) => textCell(row, "status") === "PASS").length)} of ${formatInteger(qualityRows.length)} data checks pass; the rest are information only.`,
          `${formatInteger(missing.length)} columns have missing values. The worst is ${worstMissing ? `${worstMissing.column.replace(/_/g, " ")} at ${formatNumber(worstMissing.share_pct, 2)}%` : "none"}, so the models handle blanks by filling in medians.`,
          `Batches outside the whiskers are counted as outliers. Extreme readings are kept in the analysis, not deleted.`,
        ]}
      />

      <Section title="Distributions" intro="How the main measurements are spread across all batches. Each chart stands alone.">
        {HISTOGRAM_NAMES.map((name) => {
          const bins = explore.histograms[name] ?? [];
          const histogramRows = bins.map((bin) => ({ bin: formatNumber(bin.start, 1), count: bin.count }));
          return (
            <Card key={name} title={VARIABLE_LABELS[name] ?? name} subtitle="Number of batches in each band of values" caption="The tallest bars show where most batches sit; long tails or isolated bars point to unusual batches.">
              {histogramRows.length === 0 ? (
                <p className="muted">No histogram is available for this measurement.</p>
              ) : (
                <div className="chart">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={histogramRows} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
                      <CartesianGrid {...gridProps} />
                      <XAxis dataKey="bin" {...axisProps} interval="preserveStartEnd" tick={{ fontSize: 11 }} />
                      <YAxis {...axisProps} tickFormatter={(value) => formatInteger(Number(value))} />
                      <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => [formatInteger(Number(value)), "Batches"]} />
                      <Bar dataKey="count" name="Batches" fill={palette.accent} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>
          );
        })}
        <Card title="Box plots for outliers" subtitle="Middle half, median and whiskers for each measurement, on its own scale" className="wide" caption="The shaded box holds the middle half of batches, the dark line is the median, and the thin line reaches the usual range. Outlier counts are shown at the end of each row.">
          <div className="box-plot-list">
            {boxNames.map((name) => (
              <BoxPlotRow key={name} label={VARIABLE_LABELS[name] ?? name} stats={explore.box_stats[name]} />
            ))}
          </div>
        </Card>
      </Section>

      <SectionSummary
        points={[
          `Most outliers are in ${outlierLeader.name} (${formatInteger(outlierLeader.outliers)} of ${formatInteger(outlierLeader.n)} batches, ${formatPercent((outlierLeader.outliers / outlierLeader.n) * 100, 2)}).`,
          `Median ${formatNumber(explore.box_stats.batch_size?.median ?? Number.NaN, 0)} for batch size, with the middle half between ${formatNumber(explore.box_stats.batch_size?.q1 ?? Number.NaN, 0)} and ${formatNumber(explore.box_stats.batch_size?.q3 ?? Number.NaN, 0)}.`,
          "Check the readings beyond the whiskers on the line before trusting a result built on them.",
        ]}
      />

      <Section title="Categories and missing values" intro="How many batches fall into each group, and which columns have blank cells.">
        {CATEGORY_NAMES.map((item) => (
          <CategoryChart key={item.key} title={item.label} rows={explore.category_counts[item.key] ?? []} />
        ))}
        <Card title="Missing values" subtitle="Share of blank cells in each column that has any" className="wide" caption="Longer bars mean more blank cells. The model fills blanks with the median from the training period.">
          {missingChart.length === 0 ? (
            <p className="muted">No column has missing values, so there is nothing to chart.</p>
          ) : (
            <div className="chart chart-tall">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={missingChart} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid {...gridProps} horizontal={false} />
                  <XAxis type="number" {...axisProps} tickFormatter={(value) => `${formatNumber(Number(value), 1)}%`} />
                  <YAxis type="category" dataKey="name" width={190} {...axisProps} />
                  <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => [formatPercent(Number(value), 2), "Missing"]} />
                  <Bar dataKey="share" name="Missing" fill={palette.warn} radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </Section>

      <SectionSummary
        points={[
          `Highest failure rate by dosage form: ${highestDosage.level} at ${formatNumber(highestDosage.failure_rate_pct, 2)}%, on ${formatInteger(highestDosage.batches)} batches.`,
          worstMissing
            ? `${formatInteger(missing.length)} columns have blank cells. The worst is ${worstMissing.column.replace(/_/g, " ")} at ${formatNumber(worstMissing.share_pct, 2)}% blank.`
            : "No column has blank cells.",
          "Groups with few batches give less reliable failure rates, so check the batch count before comparing.",
        ]}
      />

      <Section title="Relationships and trend" intro="How the measurements move together, and how the failure rate changed over time.">
        <CorrelationHeatmap explore={explore} />
        <Card title="Failure rate over time" subtitle="Share of batches that failed, month by month" className="wide" caption="The line moves month to month because batch counts are small; look for sustained rises rather than single spikes.">
          <div className="chart chart-tall">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="month" {...axisProps} interval={23} tick={{ fontSize: 11 }} />
                <YAxis {...axisProps} tickFormatter={(value) => `${formatNumber(Number(value), 1)}%`} />
                <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => [formatPercent(Number(value), 2), "Failure rate"]} />
                <Line type="monotone" dataKey="rate" name="Failure rate" stroke={palette.accent} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Section>

      <Section title="Data checks" intro="Automatic checks on the source files. Each row says what was checked and whether it passed.">
        <Card title="Data quality checks" subtitle="Every check run on the four source files" className="wide" caption="A PASS means the check matched the expected value; INFO means the result is recorded but not judged.">
          <DataTable
            rows={qualityRows as Row[]}
            columns={qualityColumns}
            fileName="data-quality-checks.csv"
            pageSize={12}
            renderCell={(column, row) =>
              column.key === "status" ? <StatusPill tone={toneFor(textCell(row, "status"))}>{textCell(row, "status")}</StatusPill> : undefined
            }
          />
        </Card>
      </Section>
    </>
  );
}

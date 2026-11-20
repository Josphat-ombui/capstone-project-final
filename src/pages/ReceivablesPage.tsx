import { Banknote, CalendarClock, Scale } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "../components/Card";
import { DataTable } from "../components/DataTable";
import { KpiCard } from "../components/KpiCard";
import { PageHeader } from "../components/PageHeader";
import { Section } from "../components/Section";
import { SectionSummary } from "../components/SectionSummary";
import { StatusPill } from "../components/StatusPill";
import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatFraction, formatInteger, formatKesMillions, formatNumber } from "../lib/format";
import { axisProps, gridProps, tooltipContentStyle } from "../lib/chart";
import { palette, seriesColours } from "../lib/palette";
import { useState } from "react";
import { LevelChips } from "../components/ChartControls";
import { FilterNotice } from "../components/FilterNotice";
import { useFilters } from "../components/FilterContext";
import { yearInRange } from "../lib/filters";

/** Receivables: how much credit is open, how old it is, and whether the balance field can be trusted. */
export function ReceivablesPage({ data }: { data: DashboardData }) {
  const { filters } = useFilters();
  const [shownBuckets, setShownBuckets] = useState<string[]>([]);
  const gate = data.summary.credit_gate;
  const ageing = tableRows(data, "credit_ageing");
  const share = tableRows(data, "credit_open_share").filter((row) => yearInRange(numberCell(row, "year"), filters));
  const latest = share[share.length - 1] ?? {};
  const totalOpen = ageing.reduce((total, row) => total + numberCell(row, "open_balance_KES"), 0);
  const over90 = ageing
    .filter((row) => ["91-180 days", "181-365 days", "over 365 days"].includes(textCell(row, "bucket")))
    .reduce((total, row) => total + numberCell(row, "open_balance_KES"), 0);

  const bucketLevels = ageing.map((row) => textCell(row, "bucket"));
  const ageingChart = ageing
    .filter((row) => shownBuckets.length === 0 || shownBuckets.includes(textCell(row, "bucket")))
    .map((row) => ({ bucket: textCell(row, "bucket"), balance: numberCell(row, "open_balance_KES") / 1_000_000 }));
  const shareChart = share.map((row) => ({ year: String(numberCell(row, "year")), open: numberCell(row, "open_share") * 100 }));

  return (
    <>
      <PageHeader questions={["receivables"]}
        eyebrow="Receivables"
        title="Open credit and ageing"
        description="Open credit by age, and how the open share has moved by sale year. Collection lists stay closed while the balance field fails its check."
        aside={<StatusPill tone={gate.status === "PASS" ? "good" : "bad"}>{gate.status === "PASS" ? "Balance field verified" : "Balance field not verified"}</StatusPill>}
      />

      <SectionSummary
        points={[
          `Open credit totals ${formatKesMillions(totalOpen)} across ${formatInteger(ageing.reduce((total, row) => total + numberCell(row, "invoices"), 0))} invoices.`,
          `${formatFraction(over90 / totalOpen, 0)} of the open balance is more than 90 days old.`,
          `The open share stays near ${formatFraction(numberCell(latest, "open_share"), 0)} in the latest sale year and moves only ${formatNumber(gate.spread_points, 2)} points across years. Payments are probably not recorded in the balance field.`,
          "Customer-level collection lists are not produced until the balance field is checked against the finance ledger.",
        ]}
      />

      <Section title="The position" intro="Headline figures for open credit.">
        <KpiCard icon={Banknote} label="Open credit" value={formatKesMillions(totalOpen)} hint="Sum of the five age bands" tone="accent" />
        <KpiCard icon={CalendarClock} label="Older than 90 days" value={formatFraction(over90 / totalOpen, 0)} hint={formatKesMillions(over90)} tone="warn" />
        <KpiCard icon={Scale} label="Open share, latest year" value={formatFraction(numberCell(latest, "open_share"), 1)} hint={`Sale year ${numberCell(latest, "year")}`} tone={gate.latest_year_open_share > 0.1 ? "bad" : "good"} />
      </Section>

      <FilterNotice>The open share by sale year follows the year range. Ageing, the open balance and the balance check cover all years, so the year range does not change them.</FilterNotice>
      <Section title="Ageing and trend" intro="Where the open balance sits by age, and whether the open share falls as invoices age.">
        <Card title="Open balance by age" subtitle="Days since the invoice date" caption="Bands: 0-30, 31-90, 91-180, 181-365 and over 365 days.">
          <LevelChips label="Age bands shown" levels={bucketLevels} selected={shownBuckets} onChange={setShownBuckets} />
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ageingChart}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="bucket" {...axisProps} />
                <YAxis {...axisProps} unit=" m" />
                <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => `KES ${formatNumber(Number(value), 1)} m`} />
                <Bar dataKey="balance" name="Open balance" radius={6}>
                  {ageingChart.map((row, index) => (
                    <Cell key={row.bucket} fill={seriesColours[index % seriesColours.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Open share by sale year" subtitle="Share of credit invoices with a balance still open" caption="A flat, high line means the balance field is not clearing when invoices are paid.">
          <div className="chart">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={shareChart}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="year" {...axisProps} />
                <YAxis {...axisProps} unit="%" domain={[0, 100]} />
                <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => `${formatNumber(Number(value), 1)}%`} />
                <Line type="monotone" dataKey="open" name="Open share" stroke={palette.accent} strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </Section>

      <Section title="Balance field check" intro="Why collection actions are on hold.">
        <Card title="Balance field check" subtitle="Whether the balance field is consistent with the invoice history" caption={gate.reason}>
          <DataTable
            rows={ageing}
            fileName="credit_ageing.csv"
            columns={[
              { key: "bucket", label: "Age band" },
              { key: "invoices", label: "Invoices", align: "right", format: (value) => formatInteger(Number(value)) },
              { key: "open_balance_KES", label: "Open balance (KES)", align: "right", format: (value) => formatInteger(Number(value)) },
            ]}
            pageSize={5}
          />
        </Card>
      </Section>
    </>
  );
}

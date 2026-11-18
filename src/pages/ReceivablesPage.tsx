import { type DashboardData, numberCell, tableRows, textCell } from "../lib/data";
import { formatFraction, formatInteger, formatKesMillions, formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { Bars, Findings, Grid, Kpi, Kpis, Page, Panel, Plot, Section, TableCard, Trend, type Finding } from "../components/Dash";
import type { ColumnSpec } from "../components/DataTable";

const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

const ageingColumns: ColumnSpec[] = [
  { key: "bucket", label: "Age of balance" },
  { key: "invoices", label: "Open invoices", align: "right", format: (v) => formatInteger(Number(v)) },
  { key: "open_balance_KES", label: "Open balance", align: "right", format: (v) => formatKesMillions(Number(v), 1) },
  { key: "share", label: "Share of balance", align: "right", format: (v) => formatFraction(Number(v), 1) },
];

const yearColumns: ColumnSpec[] = [
  { key: "year", label: "Sale year", align: "right" },
  { key: "credit_invoices", label: "Credit invoices", align: "right", format: (v) => formatInteger(Number(v)) },
  { key: "open_invoices", label: "Still open", align: "right", format: (v) => formatInteger(Number(v)) },
  { key: "open_balance_KES", label: "Open balance", align: "right", format: (v) => formatKesMillions(Number(v), 1) },
  { key: "open_share", label: "Share still open", align: "right", format: (v) => formatFraction(Number(v), 1) },
];

export function ReceivablesPage({ data }: { data: DashboardData }) {
  const g = data.summary.credit_gate;
  const age = tableRows(data, "credit_ageing");
  const open = sum(age.map((r) => numberCell(r, "open_balance_KES")));
  const old = sum(age.filter((r) => textCell(r, "bucket").startsWith("over")).map((r) => numberCell(r, "open_balance_KES")));
  const fail = g.status === "FAIL";
  const shareRows = tableRows(data, "credit_open_share");
  const share = shareRows.map((r) => ({ name: String(numberCell(r, "year")), value: Number((numberCell(r, "open_share") * 100).toFixed(1)) }));
  const ageingWithShare = age.map((r) => ({ ...r, share: numberCell(r, "open_balance_KES") / open }));

  const findings: Finding[] = [
    { tag: "Risk", tone: "bad", text: g.reason },
    { tag: "Action", tone: fail ? "warn" : "good", text: fail ? "Reconcile the open balances with the finance ledger before any collection action." : "Balances reconcile with the ledger. Collections can proceed." },
    { tag: "Ageing", tone: "bad", text: `${formatFraction(old / open, 0)} of open balances are over one year old, with ${formatInteger(numberCell(age[age.length - 1] ?? {}, "invoices"))} invoices in that group.` },
  ];

  return (
    <Page
      eyebrow="Commercial and supply"
      title="Credit and receivables"
      question="Can overdue customer balances be identified and collected?"
      status={fail ? { tone: "bad", text: "Data not verified" } : { tone: "good", text: "Verified" }}
      alerts={[fail && "Reconcile with finance before collections"]}
      questionIds={["receivables"]}
    >
      <Kpis>
        <Kpi tone={fail ? "bad" : "accent"} label="Open customer balances" value={`KES ${formatNumber(open / 1e9, 2)} bn`} caption="sum of all age groups" />
        <Kpi tone="bad" label="Over one year old" value={formatFraction(old / open, 0)} caption="share of open balances" />
        <Kpi tone="accent" label="Open invoices" value={formatInteger(sum(age.map((r) => numberCell(r, "invoices"))))} caption="not yet settled" />
        <Kpi tone={fail ? "bad" : "good"} label="Latest year still open" value={formatFraction(g.latest_year_open_share, 0)} caption="of the most recent year's credit sales" />
      </Kpis>

      <Section title="Key points">
        <Findings items={findings} />
      </Section>

      <Section title="Charts" note="Where the open balance sits by age, and how the open share changes by sale year.">
        <Grid cols={2}>
          <Panel title="Open balance by age, KES m" note="Red marks balances over one year old.">
            <Plot tall>
              <Bars data={age.map((r) => ({ name: textCell(r, "bucket"), value: Math.round(numberCell(r, "open_balance_KES") / 1e6) }))} fmt={(v) => formatInteger(v)} colorOf={(d) => (d.name.startsWith("over") ? palette.bad : palette.accent)} />
            </Plot>
          </Panel>
          <Panel title="Share still open by sale year, %" note="A flat line at a high level suggests payments are not being recorded, rather than late payment.">
            <Plot tall>
              <Trend data={share} fmt={(v) => `${formatNumber(v, 1)}%`} tickEvery={1} />
            </Plot>
          </Panel>
        </Grid>
      </Section>

      <Section title="Detail">
        <TableCard title="Open balance by age" note="Each age group, with its share of the total open balance." rows={ageingWithShare} columns={ageingColumns} fileName="receivables-ageing.csv" pageSize={10} />
        <TableCard title="Open share by sale year" note="For each year of credit sales: how many invoices are still open, and their balance." rows={shareRows} columns={yearColumns} fileName="receivables-by-year.csv" pageSize={12} />
      </Section>
    </Page>
  );
}

import { useMemo, useState } from "react";
import type { DashboardData } from "../lib/data";
import { formatInteger, formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { type BatchForm, predict, typicalForm } from "../lib/predictor";
import { Bars, Kpi, Kpis, Page, Panel, Plot, Section, Grid, type Tone } from "../components/Dash";

export function PredictorPage({ data }: { data: DashboardData }) {
  const spec = data.predictor;
  const [form, setForm] = useState<BatchForm | null>(() => (spec ? typicalForm(spec) : null));
  const p = useMemo(() => (spec && form ? predict(spec, form) : null), [spec, form]);

  if (!spec || !form || !p) {
    return (
      <Page eyebrow="Quality and production" title="Batch predictor" question="What is the failure chance for a batch with given settings?">
        <Section title="No model data">
          <p>The predictor settings are missing from the data file. Run the export step again.</p>
        </Section>
      </Page>
    );
  }

  const tone: Tone = p.riskLevel === "High" ? "bad" : p.riskLevel === "Elevated" ? "warn" : "good";
  const ratio = p.typicalFailureChance > 0 ? p.failureChance / p.typicalFailureChance : Number.NaN;
  const reset = () => setForm(typicalForm(spec));

  const choice = (key: "maintenance" | "dosage" | "section", label: string, options: string[]) => (
    <label>
      {label}
      <select value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </label>
  );

  return (
    <Page
      eyebrow="Quality and production"
      title="Batch predictor"
      question="What is the failure chance for a batch with given settings, and which settings push it up or down?"
      status={{ tone, text: `${p.riskLevel} risk` }}
      alerts={[p.outsideRange.length > 0 && `Settings outside the range seen in training: ${p.outsideRange.join(", ")}`]}
    >
      <Grid cols={2}>
        <Panel title="Batch settings" note="Change any setting. Each slider shows its typical value and the range seen in the training data.">
          <div className="d-form">
            {choice("maintenance", "Maintenance status", spec.inputs.maintenance_statuses)}
            {choice("dosage", "Dosage form", spec.inputs.dosage_forms)}
            {choice("section", "Manufacturing section", spec.inputs.sections)}
            {spec.inputs.numeric
              .filter((n) => !n.label.startsWith("Maintenance"))
              .map((n) => (
                <label key={n.name}>
                  <span>
                    {n.label}: <b>{formatNumber(form.numeric[n.name], 2)}</b>
                  </span>
                  <input
                    type="range"
                    min={n.low}
                    max={n.high}
                    step={(n.high - n.low) / 100}
                    value={form.numeric[n.name]}
                    onChange={(e) => setForm({ ...form, numeric: { ...form.numeric, [n.name]: Number(e.target.value) } })}
                  />
                  <span className="d-range-note">Typical {formatNumber(n.typical, 2)} · usual range {formatNumber(n.low, 2)} to {formatNumber(n.high, 2)}</span>
                </label>
              ))}
            <div>
              <button type="button" className="d-btn" onClick={reset}>Reset to a typical batch</button>
            </div>
          </div>
        </Panel>

        <div className="d-result">
          <Kpis>
            <Kpi hero tone={tone} label="Failure chance" value={`${formatNumber(p.failureChance * 100, 1)}%`} caption={`${formatInteger(p.failureChance * 1000)} per 1,000 batches`} />
            <Kpi tone="neutral" label="Typical batch" value={`${formatNumber(p.typicalFailureChance * 100, 1)}%`} caption={`${formatInteger(p.typicalFailureChance * 1000)} per 1,000 batches`} />
            <Kpi tone={tone} label="Compared with typical" value={Number.isFinite(ratio) ? `${formatNumber(ratio, 1)}x` : "-"} caption={`risk level: ${p.riskLevel.toLowerCase()}`} />
            <Kpi tone={p.flagged ? "bad" : "good"} label="QA review" value={p.flagged ? "Flag for review" : "Not flagged"} caption="a triage aid, not a release decision" />
          </Kpis>
          <Panel title="What moves the failure chance" note="Red bars push the chance up; green bars push it down, compared with a typical batch.">
            <Plot>
              {p.factors.some((f) => Math.abs(f.effect) > 0.005) ? (
                <Bars horizontal data={p.factors.slice(0, 8).map((f) => ({ name: f.label, value: Number(f.effect.toFixed(2)) }))} fmt={(v) => formatNumber(v, 2)} colorOf={(d) => (d.value > 0 ? palette.bad : palette.good)} />
              ) : (
                <p className="d-range-note">Every setting matches a typical batch, so no factor moves the result.</p>
              )}
            </Plot>
          </Panel>
        </div>
      </Grid>
    </Page>
  );
}

import { useMemo, useState } from "react";
import { type DashboardData } from "../lib/data";
import { formatNumber } from "../lib/format";
import { palette } from "../lib/palette";
import { type BatchForm, predict, typicalForm } from "../lib/predictor";
import { Bars, Page, Panel, Ring, type Tone } from "../components/Exec";

export function PredictorPage({ data }: { data: DashboardData }) {
  const spec = data.predictor;
  const [form, setForm] = useState<BatchForm | null>(() => (spec ? typicalForm(spec) : null));
  const p = useMemo(() => (spec && form ? predict(spec, form) : null), [spec, form]);
  if (!spec || !form || !p) return <Page title="Batch predictor">{null}</Page>;
  const tone: Tone = p.riskLevel === "High" ? "bad" : p.riskLevel === "Elevated" ? "warn" : "good";
  const choice = (key: "maintenance" | "dosage" | "section", label: string, options: string[]) => (
    <label>{label}<select value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}>{options.map((o) => <option key={o}>{o}</option>)}</select></label>
  );
  return (
    <Page title="Batch predictor" status={{ tone, text: p.flagged ? "Flag for review" : "Not flagged" }}>
      <div className="x-split">
        <div className="x-card x-set">
          {choice("maintenance", "Maintenance", spec.inputs.maintenance_statuses)}
          {choice("dosage", "Dosage form", spec.inputs.dosage_forms)}
          {choice("section", "Section", spec.inputs.sections)}
          {spec.inputs.numeric.filter((n) => !n.label.startsWith("Maintenance")).map((n) => (
            <label key={n.name}><span>{n.label}: <b>{formatNumber(form.numeric[n.name], 2)}</b></span>
              <input type="range" min={n.low} max={n.high} step={(n.high - n.low) / 100} value={form.numeric[n.name]} onChange={(e) => setForm({ ...form, numeric: { ...form.numeric, [n.name]: Number(e.target.value) } })} />
            </label>
          ))}
        </div>
        <div style={{ display: "grid", gap: 16, alignContent: "start" }}>
          <div className={`x-card x-gauge x-${tone}`}><Ring value={p.failureChance / 0.15} target={data.summary.failure_rate_pct / 100 / 0.15} tone={tone} size={220} text={`${formatNumber(p.failureChance * 100, 1)}%`} /><span>{p.riskLevel} risk (tick = average batch)</span></div>
          {p.factors.some((f) => Math.abs(f.effect) > 0.005) && <Panel title="What moves it"><Bars horizontal data={p.factors.slice(0, 6).map((f) => ({ name: f.label, value: Number(f.effect.toFixed(2)) }))} fmt={(v) => formatNumber(v, 2)} colorOf={(d) => (d.value > 0 ? palette.bad : palette.good)} /></Panel>}
        </div>
      </div>
    </Page>
  );
}

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Gauge, Percent, ShieldAlert, Thermometer } from "lucide-react";
import { Card } from "./Card";
import { KpiCard, type Tone } from "./KpiCard";
import { type BatchForm, type NumericInput, type Prediction, type PredictorSpec, predict, typicalForm } from "../lib/predictor";
import { formatNumber, formatPercent } from "../lib/format";
import { axisProps, gridProps, tooltipContentStyle } from "../lib/chart";
import { palette } from "../lib/palette";

/** Maintenance is chosen as one status, so the two indicator columns are not separate inputs. */
const MAINTENANCE_INDICATORS = ["maintenance_due_soon", "maintenance_critical"];

/** The measurements, grouped the way a planner thinks about a batch. Names not listed here go to "Other". */
const SETTING_GROUPS: { title: string; hint: string; names: string[] }[] = [
  {
    title: "Equipment and people",
    hint: "How old the machine is, how long since its last service, and how experienced the operator is.",
    names: ["equipment_age_years", "maintenance_days_ago", "operator_experience_years"],
  },
  {
    title: "Process readings",
    hint: "Averages and variation measured during the run.",
    names: ["temp_avg", "temp_variance", "pressure_avg", "pressure_variance", "humidity_avg"],
  },
  {
    title: "Batch and materials",
    hint: "Quality of the raw material, run length and batch size.",
    names: ["raw_material_quality", "production_hours", "batch_size"],
  },
];

/** A ready-made starting batch the user can change. */
interface Preset {
  id: string;
  label: string;
  hint: string;
  form: BatchForm;
}

/** Number of decimals to show for an input, based on its typical value. */
function decimalsFor(input: NumericInput): number {
  return Number.isInteger(input.typical) && input.high - input.low > 10 ? 0 : 2;
}

/** Step size for the slider: one hundredth of the observed range, rounded to the display precision. */
function stepFor(input: NumericInput): number {
  const step = (input.high - input.low) / 100;
  return decimalsFor(input) === 0 ? Math.max(1, Math.round(step)) : Number(step.toFixed(4)) || 0.01;
}

/** Builds the four starting examples from the training-period medians and the observed range. */
function buildPresets(spec: PredictorSpec): Preset[] {
  const typical = typicalForm(spec);
  const age = spec.inputs.numeric.find((input) => input.name === "equipment_age_years");
  const bolus = spec.inputs.dosage_forms.includes("Bolus") ? "Bolus" : typical.dosage;
  return [
    { id: "typical", label: "Typical batch", hint: "Typical values from the training years, standard dosage, and current maintenance.", form: typical },
    { id: "due-soon", label: "Maintenance due soon", hint: "The typical batch, on a machine whose service is due soon.", form: { ...typical, maintenance: "Due Soon" } },
    { id: "overdue", label: "Maintenance overdue", hint: "The typical batch, on a machine whose critical service is overdue.", form: { ...typical, maintenance: "Critical" } },
    {
      id: "old-machine",
      label: "Old machine, bolus dosage",
      hint: "Equipment at the high end of its age range, making bolus tablets.",
      form: { ...typical, dosage: bolus, numeric: { ...typical.numeric, equipment_age_years: age?.high ?? typical.numeric.equipment_age_years } },
    },
  ];
}

/** One measurement: a number box for exact values and a slider for quick changes. */
function SettingField({ input, value, onChange }: { input: NumericInput; value: number; onChange: (value: number) => void }) {
  const decimals = decimalsFor(input);
  const step = stepFor(input);
  return (
    <div className="setting-field">
      <div className="setting-head">
        <label htmlFor={`in-${input.name}`}>{input.label}</label>
        <input id={`in-${input.name}`} className="setting-number" type="number" step={step} value={Number.isFinite(value) ? value : ""} onChange={(event) => onChange(Number(event.target.value))} />
      </div>
      <input
        type="range"
        min={input.low}
        max={input.high}
        step={step}
        value={Math.min(Math.max(value, input.low), input.high)}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label={`${input.label} slider`}
      />
      <span className="predictor-range">
        Typical {formatNumber(input.typical, decimals)} · usual range {formatNumber(input.low, decimals)} to {formatNumber(input.high, decimals)}
      </span>
    </div>
  );
}

/** A plain sentence for one factor, against a typical batch. */
function factorSentence(factor: Prediction["factors"][number], direction: "up" | "down"): string {
  const size = Math.abs(factor.effect);
  const strength = size >= 0.5 ? "a lot" : size >= 0.1 ? "somewhat" : "a little";
  return direction === "up" ? `${factor.label} pushes the risk up ${strength} compared with a typical batch.` : `${factor.label} pulls the risk down ${strength} compared with a typical batch.`;
}

/** Three steps: pick an example, adjust the settings, read the result with the factors behind it. */
export function BatchPredictorGuide({ spec }: { spec: PredictorSpec }) {
  const presets = useMemo(() => buildPresets(spec), [spec]);
  const [presetId, setPresetId] = useState<string>("typical");
  const [form, setForm] = useState<BatchForm>(() => presets[0].form);
  const prediction = useMemo(() => predict(spec, form), [spec, form]);
  const typical = useMemo(() => predict(spec, typicalForm(spec)), [spec]);

  const inputByName = new Map(spec.inputs.numeric.map((input) => [input.name, input]));
  const groupedNames = new Set(SETTING_GROUPS.flatMap((group) => group.names));
  const otherInputs = spec.inputs.numeric.filter((input) => !groupedNames.has(input.name) && !MAINTENANCE_INDICATORS.includes(input.name));

  /** Chooses one of the starting examples. */
  function choosePreset(preset: Preset) {
    setPresetId(preset.id);
    setForm(preset.form);
  }

  /** Changes one measurement. The example label then reads "Custom". */
  function changeNumeric(name: string, value: number) {
    setPresetId("custom");
    setForm((current) => ({ ...current, numeric: { ...current.numeric, [name]: value } }));
  }

  /** Changes one category choice. */
  function changeChoice(key: "dosage" | "section" | "maintenance", value: string) {
    setPresetId("custom");
    setForm((current) => ({ ...current, [key]: value }));
  }

  const chanceTone: Tone = prediction.riskLevel === "High" ? "bad" : prediction.riskLevel === "Elevated" ? "warn" : "good";
  const perThousand = Math.round(prediction.failureChance * 1000);
  const typicalPerThousand = Math.round(typical.failureChance * 1000);
  const upFactors = prediction.factors.filter((factor) => factor.effect > 0).slice(0, 3);
  const downFactors = prediction.factors.filter((factor) => factor.effect < 0).slice(0, 3);
  const chartFactors = prediction.factors.slice(0, 8).map((factor) => ({ name: factor.label, effect: factor.effect }));
  const baseRate = formatPercent(spec.base_rate_test * 100, 2);
  const activePreset = presets.find((preset) => preset.id === presetId);

  return (
    <div className="predictor guide">
      <section className="guide-step" aria-labelledby="step-1">
        <h2 id="step-1" className="step-title">
          <span className="step-num">1</span> Pick a starting example
        </h2>
        <div className="preset-grid" role="group" aria-label="Starting examples">
          {presets.map((preset) => (
            <button key={preset.id} type="button" className={`preset ${presetId === preset.id ? "active" : ""}`} aria-pressed={presetId === preset.id} onClick={() => choosePreset(preset)}>
              <strong>{preset.label}</strong>
              <span>{preset.hint}</span>
            </button>
          ))}
        </div>
        {presetId === "custom" && <p className="muted small">Showing custom settings. Pick an example above to start again.</p>}
        {activePreset && presetId !== "custom" && <p className="muted small">Example: {activePreset.label}. Change any setting below to test a different batch.</p>}
      </section>

      <section className="guide-step" aria-labelledby="step-2">
        <h2 id="step-2" className="step-title">
          <span className="step-num">2</span> Adjust the settings
        </h2>
        <p className="muted small">Type a value or move the slider. Each setting shows its typical value and the range seen in the training data.</p>

        <div className="choice-grid">
          <label className="filter-field">
            <span>Maintenance status</span>
            <select aria-label="Maintenance status" value={form.maintenance} onChange={(event) => changeChoice("maintenance", event.target.value)}>
              {spec.inputs.maintenance_statuses.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Dosage form</span>
            <select aria-label="Dosage form" value={form.dosage} onChange={(event) => changeChoice("dosage", event.target.value)}>
              {spec.inputs.dosage_forms.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="filter-field">
            <span>Manufacturing section</span>
            <select aria-label="Manufacturing section" value={form.section} onChange={(event) => changeChoice("section", event.target.value)}>
              {spec.inputs.sections.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </div>

        {SETTING_GROUPS.map((group) => {
          const inputs = group.names.map((name) => inputByName.get(name)).filter((input): input is NumericInput => input !== undefined);
          if (inputs.length === 0) return null;
          return (
            <fieldset key={group.title} className="setting-group">
              <legend>{group.title}</legend>
              <p className="muted small">{group.hint}</p>
              <div className="setting-grid">
                {inputs.map((input) => (
                  <SettingField key={input.name} input={input} value={form.numeric[input.name]} onChange={(value) => changeNumeric(input.name, value)} />
                ))}
              </div>
            </fieldset>
          );
        })}

        {otherInputs.length > 0 && (
          <fieldset className="setting-group">
            <legend>Other measurements</legend>
            <div className="setting-grid">
              {otherInputs.map((input) => (
                <SettingField key={input.name} input={input} value={form.numeric[input.name]} onChange={(value) => changeNumeric(input.name, value)} />
              ))}
            </div>
          </fieldset>
        )}

        <div className="guide-actions">
          <button type="button" className="btn" onClick={() => choosePreset(presets[0])}>
            Reset to typical batch
          </button>
        </div>

        {prediction.outsideRange.length > 0 && (
          <p className="filter-notice" role="note">
            Outside the range seen in the training data: {prediction.outsideRange.join(", ")}. The result is an extrapolation, so treat it with extra care.
          </p>
        )}
      </section>

      <section className="guide-step" aria-labelledby="step-3">
        <h2 id="step-3" className="step-title">
          <span className="step-num">3</span> Read the result
        </h2>

        <div className={`risk-band risk-${chanceTone}`} role="status">
          <p className="risk-label">Risk level: {prediction.riskLevel}</p>
          <p className="risk-sentence">
            About <strong>{perThousand}</strong> in 1,000 batches set up like this would fail. A typical batch: about {typicalPerThousand} in 1,000.
          </p>
          <p className="risk-note">
            {prediction.flagged
              ? "This batch is above the QA review threshold. Check it before release."
              : "This batch is below the QA review threshold, so no extra review is triggered by the model."}
          </p>
        </div>

        <div className="predictor-results">
          <div className="kpi-row">
            <KpiCard icon={Percent} label="Predicted failure chance" value={formatPercent(prediction.failureChance * 100, 2)} hint={`Typical batch ${formatPercent(typical.failureChance * 100, 2)}`} tone={chanceTone} />
            <KpiCard icon={Gauge} label="Predicted success rate" value={formatPercent(prediction.successRate * 100, 2)} hint="One minus the failure chance" tone="accent" />
            <KpiCard icon={Thermometer} label="Risk level" value={prediction.riskLevel} hint={`Compared with the base rate of ${baseRate}`} tone={chanceTone} />
            <KpiCard icon={ShieldAlert} label="QA review" value={prediction.flagged ? "Flag for review" : "Not flagged"} hint="Same threshold as the batch alerts" tone={prediction.flagged ? "bad" : "good"} />
          </div>
        </div>

        <div className="grid-2 factor-lists">
          <Card title="Factors raising the risk" subtitle="The largest increases against a typical batch" kind="Multivariate">
            {upFactors.length === 0 ? (
              <p className="muted">Nothing in these settings raises the risk above a typical batch.</p>
            ) : (
              <ul className="plain-list">
                {upFactors.map((factor) => (
                  <li key={factor.column}>{factorSentence(factor, "up")}</li>
                ))}
              </ul>
            )}
          </Card>
          <Card title="Factors lowering the risk" subtitle="The largest decreases against a typical batch" kind="Multivariate">
            {downFactors.length === 0 ? (
              <p className="muted">Nothing in these settings lowers the risk below a typical batch.</p>
            ) : (
              <ul className="plain-list">
                {downFactors.map((factor) => (
                  <li key={factor.column}>{factorSentence(factor, "down")}</li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="What drives this result" subtitle="Each bar shows how far one setting moves the score, compared with a typical batch" kind="Multivariate" caption="Bars to the right push the risk up and bars to the left pull it down. Values are on the model's score scale, not percentage points.">
          {chartFactors.length === 0 ? (
            <p className="muted">Nothing moves the result yet, because these settings are the typical batch. Change a setting in step 2 to see which factors push the risk.</p>
          ) : (
            <div className="chart chart-tall">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartFactors} layout="vertical" margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
                  <CartesianGrid {...gridProps} horizontal={false} />
                  <XAxis type="number" {...axisProps} />
                  <YAxis type="category" dataKey="name" width={200} {...axisProps} />
                  <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => formatNumber(Number(value), 3)} />
                  <Bar dataKey="effect" name="Effect on risk score" radius={4}>
                    {chartFactors.map((factor) => (
                      <Cell key={factor.name} fill={factor.effect >= 0 ? palette.bad : palette.good} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <details className="what-is-this" open>
          <summary>What do these results mean?</summary>
          <dl>
            <div>
              <dt>Predicted failure chance</dt>
              <dd>The model's estimate of how often batches set up like this fail. It is checked against past batches, so the predicted and observed rates agree.</dd>
            </div>
            <div>
              <dt>Risk levels</dt>
              <dd>
                Lower: below the base rate of {baseRate}. Elevated: between one and two times the base rate. High: at least twice the base rate.
              </dd>
            </div>
            <div>
              <dt>Use</dt>
              <dd>{spec.notes.join(" ")}</dd>
            </div>
          </dl>
        </details>

        <p className="muted small predictor-note">Calibrated on {spec.calibration.fitted_on}.</p>
      </section>
    </div>
  );
}

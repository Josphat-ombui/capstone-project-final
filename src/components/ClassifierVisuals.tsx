import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "./Card";
import { axisProps, gridProps, tooltipContentStyle } from "../lib/chart";
import { palette } from "../lib/palette";
import { formatInteger, formatNumber, formatPercent } from "../lib/format";

export interface ConfusionCounts {
  tp: number;
  fp: number;
  fn: number;
  tn: number;
}

/** A 2 by 2 grid: real outcome against what the alert flagged, with counts and shares. */
export function ConfusionMatrixCard({ counts }: { counts: ConfusionCounts }) {
  const total = counts.tp + counts.fp + counts.fn + counts.tn;
  const cells = [
    { label: "Failed, flagged", value: counts.tp, row: 0, col: 0, tone: palette.good },
    { label: "Failed, not flagged", value: counts.fn, row: 0, col: 1, tone: palette.bad },
    { label: "Passed, flagged", value: counts.fp, row: 1, col: 0, tone: palette.warn },
    { label: "Passed, not flagged", value: counts.tn, row: 1, col: 1, tone: palette.good },
  ];
  return (
    <Card title="Confusion matrix" subtitle="Test period 2024 to 2026" caption="Rows are real outcomes and columns are alert decisions. Green cells are correct decisions.">
      <div className="confusion" role="table" aria-label="Confusion matrix of batch alerts">
        <div className="confusion-corner" />
        <div className="confusion-head" role="columnheader">Flagged</div>
        <div className="confusion-head" role="columnheader">Not flagged</div>
        {[0, 1].map((row) => (
          <div key={row} className="confusion-row" role="row">
            <div className="confusion-side" role="rowheader">{row === 0 ? "Failed" : "Passed"}</div>
            {cells
              .filter((cell) => cell.row === row)
              .sort((first, second) => first.col - second.col)
              .map((cell) => (
                <div
                  key={cell.label}
                  role="cell"
                  className="confusion-cell"
                  style={{ background: `${cell.tone}22`, borderColor: cell.tone }}
                  title={`${cell.label}: ${formatInteger(cell.value)}`}
                >
                  <strong>{formatInteger(cell.value)}</strong>
                  <span>{formatPercent((cell.value / total) * 100, 1)} of batches</span>
                </div>
              ))}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** ROC curve with the chance diagonal. The further the curve bows to the top-left, the better the ranking. */
export function RocCard({ points, auc }: { points: { fpr: number; tpr: number }[]; auc: number }) {
  return (
    <Card title="ROC curve" subtitle={`Area under the curve ${formatNumber(auc, 3)}`} caption="The dashed diagonal is random guessing. The solid curve needs to sit well above it.">
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis type="number" dataKey="fpr" domain={[0, 1]} name="False alarms" {...axisProps} tickFormatter={(value) => formatNumber(Number(value), 1)} />
            <YAxis type="number" domain={[0, 1]} name="Failures caught" {...axisProps} tickFormatter={(value) => formatNumber(Number(value), 1)} />
            <Tooltip contentStyle={tooltipContentStyle} formatter={(value) => formatNumber(Number(value), 3)} />
            <ReferenceLine segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]} stroke={palette.axis} strokeDasharray="5 5" />
            <Line type="monotone" dataKey="tpr" name="Failures caught" stroke={palette.accent} strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

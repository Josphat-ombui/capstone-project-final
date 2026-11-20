/** Per-visual controls: show or hide categories inside one chart, without changing the dashboard filters. */

/** Chips that show or hide categories in a single visual. An empty selection means every category is shown. */
export function LevelChips({ label, levels, selected, onChange }: { label: string; levels: string[]; selected: string[]; onChange: (next: string[]) => void }) {
  const effective = selected.length > 0 ? selected : levels;
  const allShown = selected.length === 0;

  /** Shows or hides one category. Hiding the last shown category shows everything again. */
  function toggle(level: string) {
    const next = effective.includes(level) ? effective.filter((item) => item !== level) : [...effective, level];
    onChange(next.length === 0 || next.length === levels.length ? [] : next);
  }

  return (
    <div className="level-chips" role="group" aria-label={label}>
      <button type="button" className="chip chip-small" aria-pressed={allShown} onClick={() => onChange([])}>
        All
      </button>
      {levels.map((level) => (
        <button key={level} type="button" className="chip chip-small" aria-pressed={effective.includes(level)} onClick={() => toggle(level)}>
          {level}
        </button>
      ))}
    </div>
  );
}

/** Reads the category name from a click on a chart bar. Recharts passes the bar's data under payload. */
export function levelFromBarClick(entry: unknown): string | undefined {
  if (entry && typeof entry === "object" && "payload" in entry) {
    const payload = (entry as { payload?: unknown }).payload;
    if (payload && typeof payload === "object" && "level" in payload) {
      return String((payload as { level: unknown }).level);
    }
  }
  return undefined;
}

/** A small hint under a chart that explains the click behaviour. */
export function ClickHint({ children }: { children: string }) {
  return <p className="click-hint">{children}</p>;
}

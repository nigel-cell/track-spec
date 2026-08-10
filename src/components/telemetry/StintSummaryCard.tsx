import type { StintSummary } from "../../lib/sessions";
import { formatSpeedKmh, type TuneUnits } from "../../lib/units";
import { Card, Label } from "../ui/Card";

interface StintSummaryCardProps {
  stint: StintSummary;
  units: TuneUnits;
  lookupCar: (ordinal: number) => string | null;
  trackLabel?: string | null;
  tuneLabel?: string | null;
}

export function StintSummaryCard({
  stint,
  units,
  lookupCar,
  trackLabel,
  tuneLabel,
}: StintSummaryCardProps) {
  const carNames = stint.carsUsed
    .map((c) => lookupCar(c.carOrdinal) ?? `Car #${c.carOrdinal}`)
    .join(", ");

  return (
    <Card>
      <Label>Stint summary</Label>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat label="Laps" value={String(stint.lapCount)} />
        <Stat label="Best" value={stint.bestLapLabel ?? "—"} accent />
        <Stat label="Average" value={stint.averageLapLabel ?? "—"} />
        <Stat
          label="Consistency"
          value={stint.consistencyPct != null ? `${stint.consistencyPct}% ≤+1%` : "—"}
        />
        <Stat label="Top speed" value={formatSpeedKmh(stint.topSpeedKmh, units)} />
        <Stat label="Track" value={trackLabel || "—"} />
      </div>
      {carNames && (
        <p className="mt-3 text-xs text-[var(--ts-muted)]">
          Cars used · <span className="text-[var(--ts-text)]">{carNames}</span>
        </p>
      )}
      {tuneLabel && (
        <p className="mt-1 text-xs text-[var(--ts-muted)]">
          Tune · <span className="text-[var(--ts-text)]">{tuneLabel}</span>
        </p>
      )}
    </Card>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] tracking-wider text-[var(--ts-muted)]">{label.toUpperCase()}</div>
      <div
        className="mt-0.5 font-[family-name:var(--ts-font-mono)] text-sm font-semibold tabular-nums"
        style={{ color: accent ? "var(--ts-accent)" : "var(--ts-text)" }}
      >
        {value}
      </div>
    </div>
  );
}

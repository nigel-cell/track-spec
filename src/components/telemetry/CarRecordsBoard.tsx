import type { CarRecord } from "../../lib/sessions";
import { formatSpeedKmh, type TuneUnits } from "../../lib/units";
import { Card, Label } from "../ui/Card";

interface CarRecordsBoardProps {
  records: CarRecord[];
  units: TuneUnits;
  lookupCar: (ordinal: number) => string | null;
  onOpenSession?: (sessionId: string) => void;
}

function carName(ordinal: number, lookup: (n: number) => string | null) {
  if (!ordinal || ordinal <= 0) return "Unknown car";
  return lookup(ordinal) ?? `Car #${ordinal}`;
}

export function CarRecordsBoard({ records, units, lookupCar, onOpenSession }: CarRecordsBoardProps) {
  if (records.length === 0) {
    return (
      <Card>
        <Label>Best by car</Label>
        <p className="mt-2 text-xs text-[var(--ts-muted)]">
          Personal bests per car appear after you complete flying laps in each car.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <Label>Best by car</Label>
          <p className="mt-1 text-xs text-[var(--ts-muted)]">Your PB in every car you’ve timed</p>
        </div>
        <span className="font-[family-name:var(--ts-font-mono)] text-[10px] tracking-wider text-[var(--ts-muted)]">
          {records.length} CAR{records.length === 1 ? "" : "S"}
        </span>
      </div>

      <div className="space-y-2">
        {records.map((rec) => (
          <button
            key={rec.carOrdinal}
            type="button"
            disabled={!onOpenSession || !rec.sessionId}
            onClick={() => rec.sessionId && onOpenSession?.(rec.sessionId)}
            className="flex w-full flex-wrap items-center justify-between gap-2 rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-bg)] px-3 py-2.5 text-left disabled:cursor-default"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--ts-text)]">
                {carName(rec.carOrdinal, lookupCar)}
              </p>
              <p className="mt-0.5 text-[11px] text-[var(--ts-muted)]">
                {rec.classLabel} {rec.carPI > 0 ? `· ${rec.carPI} PI` : ""}
                {rec.trackLabel ? ` · ${rec.trackLabel}` : ""}
              </p>
            </div>
            <div className="text-right">
              <div
                className="font-[family-name:var(--ts-font-mono)] text-base font-semibold tabular-nums text-[var(--ts-accent)]"
                style={{ letterSpacing: "var(--ts-data-tracking)" }}
              >
                {rec.bestLapLabel}
              </div>
              <div className="font-[family-name:var(--ts-font-mono)] text-[10px] text-[var(--ts-muted)]">
                Top {formatSpeedKmh(rec.topSpeedKmh, units)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}

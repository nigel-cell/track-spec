import type { ClassRecord } from "../../lib/sessions";
import { Card, Label } from "../ui/Card";

interface ClassRecordsBoardProps {
  records: ClassRecord[];
  lookupCar: (ordinal: number) => string | null;
  onOpenSession?: (sessionId: string) => void;
}

function carName(ordinal: number, lookup: (n: number) => string | null) {
  if (!ordinal || ordinal <= 0) return "Unknown car";
  return lookup(ordinal) ?? `Car #${ordinal}`;
}

export function ClassRecordsBoard({ records, lookupCar, onOpenSession }: ClassRecordsBoardProps) {
  if (records.length === 0) {
    return (
      <Card>
        <Label>Best by class</Label>
        <p className="mt-2 text-xs text-[var(--ts-muted)]">
          Class records appear after you complete flying laps. Each class keeps your best time and every car you used.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex items-end justify-between gap-2">
        <div>
          <Label>Best by class</Label>
          <p className="mt-1 text-xs text-[var(--ts-muted)]">All-time best lap per class · cars you used</p>
        </div>
        <span className="font-[family-name:var(--ts-font-mono)] text-[10px] tracking-wider text-[var(--ts-muted)]">
          {records.length} CLASS{records.length === 1 ? "" : "ES"}
        </span>
      </div>

      <div className="space-y-3">
        {records.map((rec) => {
          const cars = rec.carsUsed?.length
            ? rec.carsUsed
            : rec.carOrdinal > 0
              ? [{ carOrdinal: rec.carOrdinal, carPI: rec.carPI }]
              : [];
          const pbCar = carName(rec.carOrdinal, lookupCar);

          return (
            <div
              key={rec.carClass}
              className="rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-bg)] px-3 py-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[var(--ts-accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--ts-accent)]">
                      {rec.classLabel}
                    </span>
                    <button
                      type="button"
                      disabled={!onOpenSession || !rec.sessionId}
                      onClick={() => rec.sessionId && onOpenSession?.(rec.sessionId)}
                      className="font-[family-name:var(--ts-font-mono)] text-lg font-semibold tabular-nums text-[var(--ts-text)] disabled:cursor-default"
                      style={{ letterSpacing: "var(--ts-data-tracking)" }}
                    >
                      {rec.bestLapLabel}
                    </button>
                  </div>
                  <p className="mt-1 truncate text-sm text-[var(--ts-text)]">
                    PB car · {pbCar}
                    {rec.carPI > 0 ? ` · ${rec.carPI} PI` : ""}
                    {rec.trackLabel ? ` · ${rec.trackLabel}` : ""}
                  </p>
                </div>
              </div>

              {cars.length > 0 && (
                <div className="mt-2 border-t border-[var(--ts-border)] pt-2">
                  <div className="mb-1 text-[10px] tracking-wider text-[var(--ts-muted)]">
                    CARS USED ({cars.length})
                  </div>
                  <ul className="space-y-1">
                    {cars.map((car) => {
                      const isPb = car.carOrdinal === rec.carOrdinal;
                      return (
                        <li
                          key={car.carOrdinal}
                          className="flex flex-wrap items-baseline justify-between gap-2 text-xs"
                        >
                          <span className={isPb ? "text-[var(--ts-text)]" : "text-[var(--ts-muted)]"}>
                            {carName(car.carOrdinal, lookupCar)}
                            {isPb && (
                              <span className="ml-2 text-[10px] font-semibold tracking-wide text-[var(--ts-accent)]">
                                PB
                              </span>
                            )}
                          </span>
                          {car.carPI > 0 && (
                            <span className="font-[family-name:var(--ts-font-mono)] text-[10px] text-[var(--ts-muted)]">
                              {car.carPI} PI
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

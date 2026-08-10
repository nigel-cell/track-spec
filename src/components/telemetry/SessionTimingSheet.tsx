import { formatDelta } from "../../lib/lapTime";
import { buildTimingSheetRows } from "../../lib/sessions";
import { formatSpeedKmh, type TuneUnits } from "../../lib/units";
import { Card, Label } from "../ui/Card";

export interface TimingSheetLap {
  id: string;
  lapNumber: number;
  time: number;
  timeLabel: string;
  topSpeedKmh?: number | null;
}

interface SessionTimingSheetProps {
  laps: TimingSheetLap[];
  sessionBest?: number | null;
  units: TuneUnits;
  /** Highlight lap ids selected for compare (optional). */
  pickA?: string | null;
  pickB?: string | null;
  onPickLap?: (lapId: string) => void;
  compact?: boolean;
  title?: string;
  subtitle?: string;
}

export function SessionTimingSheet({
  laps,
  sessionBest = null,
  units,
  pickA = null,
  pickB = null,
  onPickLap,
  compact = false,
  title = "Timing sheet",
  subtitle,
}: SessionTimingSheetProps) {
  const rows = buildTimingSheetRows(laps, sessionBest);

  if (rows.length === 0) {
    return (
      <Card className={compact ? "p-3" : undefined}>
        <Label>{title}</Label>
        <p className="mt-2 text-xs text-[var(--ts-muted)]">No laps recorded yet.</p>
      </Card>
    );
  }

  return (
    <Card className={compact ? "p-3" : undefined}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <Label>{title}</Label>
          {subtitle && <p className="mt-1 text-xs text-[var(--ts-muted)]">{subtitle}</p>}
        </div>
        <span className="font-[family-name:var(--ts-font-mono)] text-[10px] tracking-wider text-[var(--ts-muted)]">
          {rows.length} LAP{rows.length === 1 ? "" : "S"}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[320px] border-collapse text-left">
          <thead>
            <tr className="text-[10px] tracking-wider text-[var(--ts-muted)]">
              <th className="pb-2 pr-2 font-medium">LAP</th>
              <th className="pb-2 pr-2 font-medium">TIME</th>
              <th className="pb-2 pr-2 font-medium">GAP</th>
              <th className="pb-2 pr-2 font-medium">TOP</th>
              {!compact && <th className="pb-2 font-medium">PREV</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isA = pickA === row.id;
              const isB = pickB === row.id;
              const selected = isA || isB;
              const gapColor =
                row.gapToBest == null
                  ? "var(--ts-muted)"
                  : row.isBest
                    ? "var(--ts-accent)"
                    : row.gapToBest > 0
                      ? "var(--ts-warning)"
                      : "var(--ts-success)";

              const content = (
                <>
                  <td className="py-1.5 pr-2 align-middle">
                    <span className="font-[family-name:var(--ts-font-mono)] text-sm tabular-nums">
                      {row.lapNumber}
                      {isA && " · A"}
                      {isB && " · B"}
                    </span>
                    {row.isBest && (
                      <span className="ml-2 text-[10px] font-semibold tracking-wide text-[var(--ts-accent)]">
                        BEST
                      </span>
                    )}
                  </td>
                  <td className="py-1.5 pr-2 align-middle">
                    <span
                      className="font-[family-name:var(--ts-font-mono)] text-sm font-semibold tabular-nums"
                      style={{ color: row.isBest ? "var(--ts-accent)" : "var(--ts-text)" }}
                    >
                      {row.timeLabel}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 align-middle">
                    <span
                      className="font-[family-name:var(--ts-font-mono)] text-xs tabular-nums"
                      style={{ color: gapColor }}
                    >
                      {row.isBest ? "—" : formatDelta(row.gapToBest)}
                    </span>
                  </td>
                  <td className="py-1.5 pr-2 align-middle">
                    <span
                      className="font-[family-name:var(--ts-font-mono)] text-xs tabular-nums"
                      style={{ color: row.isTopSpeedBest ? "var(--ts-accent)" : "var(--ts-text)" }}
                    >
                      {formatSpeedKmh(row.topSpeedKmh, units)}
                    </span>
                  </td>
                  {!compact && (
                    <td className="py-1.5 align-middle">
                      <span className="font-[family-name:var(--ts-font-mono)] text-xs tabular-nums text-[var(--ts-muted)]">
                        {row.gapToPrev == null ? "—" : formatDelta(row.gapToPrev)}
                      </span>
                    </td>
                  )}
                </>
              );

              if (onPickLap) {
                return (
                  <tr
                    key={row.id}
                    onClick={() => onPickLap(row.id)}
                    className={[
                      "cursor-pointer border-t border-[var(--ts-border)] transition-colors",
                      selected ? "bg-[var(--ts-accent-soft)]" : "hover:bg-[var(--ts-surface)]",
                    ].join(" ")}
                  >
                    {content}
                  </tr>
                );
              }

              return (
                <tr key={row.id} className="border-t border-[var(--ts-border)]">
                  {content}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

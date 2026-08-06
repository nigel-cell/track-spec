import { Card, Label } from "../ui/Card";
import { formatDelta, formatLapTime } from "../../lib/lapTime";
import type { TelemetryFrame } from "../../lib/telemetry";

interface LapTimerProps {
  telemetry: TelemetryFrame | null;
  variant?: "default" | "hud";
}

export function LapTimer({ telemetry, variant = "default" }: LapTimerProps) {
  const active = telemetry?.raceMode ?? false;
  const current = active ? telemetry?.lapElapsed : null;
  const delta = active ? telemetry?.lapDelta : null;
  const last = telemetry?.lastLap ?? null;
  const best = telemetry?.sessionBest ?? null;
  const lapNum = telemetry?.lapNumber;

  const deltaColor =
    delta == null ? "var(--ts-muted)" : delta >= 0 ? "var(--ts-warning)" : "var(--ts-success)";

  if (variant === "hud") {
    return (
      <div className="grid grid-cols-4 gap-2 text-center">
        <div>
          <div className="text-[9px] tracking-wider text-[var(--ts-muted)]">
            {active ? `LAP ${lapNum ?? "—"}` : "CURRENT"}
          </div>
          <div
            className="font-[family-name:var(--ts-font-mono)] text-xl font-semibold tabular-nums leading-tight text-[var(--ts-text)]"
            style={{ letterSpacing: "var(--ts-data-tracking)" }}
          >
            {formatLapTime(current)}
          </div>
        </div>
        <div>
          <div className="text-[9px] tracking-wider text-[var(--ts-muted)]">DELTA</div>
          <div
            className="font-[family-name:var(--ts-font-mono)] text-lg font-semibold tabular-nums leading-tight"
            style={{ color: deltaColor }}
          >
            {formatDelta(delta)}
          </div>
        </div>
        <div>
          <div className="text-[9px] tracking-wider text-[var(--ts-muted)]">LAST</div>
          <div className="font-[family-name:var(--ts-font-mono)] text-sm font-medium tabular-nums text-[var(--ts-text)]">
            {formatLapTime(last)}
          </div>
        </div>
        <div>
          <div className="text-[9px] tracking-wider text-[var(--ts-muted)]">BEST</div>
          <div
            className="font-[family-name:var(--ts-font-mono)] text-sm font-semibold tabular-nums"
            style={{ color: "var(--ts-accent)" }}
          >
            {formatLapTime(best)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Label>Lap timer</Label>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide"
            style={{
              color: active ? "var(--ts-accent)" : "var(--ts-muted)",
              background: active ? "var(--ts-accent-soft)" : "var(--ts-surface)",
            }}
          >
            {active ? "TIMING" : "STANDBY"}
          </span>
        </div>
        {active && lapNum != null && (
          <span className="font-[family-name:var(--ts-font-mono)] text-xs text-[var(--ts-muted)]">
            Lap {lapNum}
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-end">
        <div>
          <div className="mb-1 text-[10px] tracking-wider text-[var(--ts-muted)]">CURRENT</div>
          <div
            className="font-[family-name:var(--ts-font-mono)] text-3xl font-semibold tabular-nums text-[var(--ts-text)] md:text-4xl"
            style={{ letterSpacing: "var(--ts-data-tracking)" }}
          >
            {formatLapTime(current)}
          </div>
        </div>

        <div className="text-center md:pb-1">
          <div className="mb-1 text-[10px] tracking-wider text-[var(--ts-muted)]">
            DELTA{telemetry?.deltaAligned ? " · same point" : ""}
          </div>
          <div
            className="font-[family-name:var(--ts-font-mono)] text-xl font-semibold tabular-nums"
            style={{ color: deltaColor }}
          >
            {formatDelta(delta)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:col-span-1 md:grid-cols-1 md:gap-2 md:text-right">
          <div>
            <div className="mb-1 text-[10px] tracking-wider text-[var(--ts-muted)]">LAST</div>
            <div className="font-[family-name:var(--ts-font-mono)] text-lg font-medium tabular-nums text-[var(--ts-text)]">
              {formatLapTime(last)}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] tracking-wider text-[var(--ts-muted)]">BEST</div>
            <div
              className="font-[family-name:var(--ts-font-mono)] text-lg font-semibold tabular-nums"
              style={{ color: "var(--ts-accent)" }}
            >
              {formatLapTime(best)}
            </div>
          </div>
        </div>
      </div>

      {!active && (
        <p className="mt-4 text-xs text-[var(--ts-muted)]">
          Start a race or time trial in Forza — the clock appears when lap timing is active.
          After your first flying lap, delta compares you to session best at the same track distance.
        </p>
      )}
    </Card>
  );
}

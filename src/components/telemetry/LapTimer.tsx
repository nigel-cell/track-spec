import { Card, Label } from "../ui/Card";
import { formatDelta, formatLapTime } from "../../lib/lapTime";
import { formatSpeedKmh, type TuneUnits } from "../../lib/units";
import { getClassLabel, type TelemetryFrame } from "../../lib/telemetry";

interface LapTimerProps {
  telemetry: TelemetryFrame | null;
  units: TuneUnits;
  variant?: "default" | "hud";
}

export function LapTimer({ telemetry, units, variant = "default" }: LapTimerProps) {
  const active = telemetry?.raceMode ?? false;
  const current = active ? telemetry?.lapElapsed : null;
  const delta = active ? telemetry?.lapDelta : null;
  const ghost = active ? telemetry?.ghostDelta : null;
  const last = telemetry?.lastLap ?? null;
  const best = telemetry?.sessionBest ?? null;
  const classBest = telemetry?.classBest ?? null;
  const carBest = telemetry?.carBest ?? null;
  const raceTime = active ? telemetry?.raceTime : null;
  const lapTop = active ? telemetry?.lapTopSpeedKmh : null;
  const lapNum = telemetry?.lapNumber;
  const classLabel = telemetry ? getClassLabel(telemetry.carClass) : "?";

  const deltaColor =
    delta == null
      ? "var(--ts-muted)"
      : delta >= 0
        ? "var(--ts-warning)"
        : "var(--ts-success)";
  const ghostColor =
    ghost == null
      ? "var(--ts-muted)"
      : ghost >= 0
        ? "var(--ts-warning)"
        : "var(--ts-accent)";

  if (variant === "hud") {
    return (
      <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
        <HudCell
          label={active && lapNum != null ? `LAP ${lapNum}` : "CURRENT"}
          value={formatLapTime(current)}
          large
        />
        <HudCell label="DELTA" value={formatDelta(delta)} color={deltaColor} />
        <HudCell label="GHOST" value={formatDelta(ghost)} color={ghostColor} />
        <HudCell label="BEST" value={formatLapTime(best)} accent />
        <HudCell label={`CLS ${classLabel}`} value={formatLapTime(classBest)} />
        <HudCell label="TOP" value={formatSpeedKmh(lapTop, units)} />
      </div>
    );
  }

  return (
    <Card
      className={
        telemetry?.beatingClass || telemetry?.beatingSession
          ? "ring-1 ring-[var(--ts-accent-border)]"
          : undefined
      }
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Label>Live timing</Label>
          <span
            className="rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide"
            style={{
              color: active ? "var(--ts-accent)" : "var(--ts-muted)",
              background: active ? "var(--ts-accent-soft)" : "var(--ts-surface)",
            }}
          >
            {active ? "TIMING" : "STANDBY"}
          </span>
          {(telemetry?.beatingSession || telemetry?.beatingClass) && (
            <span className="rounded-full bg-[var(--ts-accent-soft)] px-2 py-0.5 text-[10px] font-semibold tracking-wide text-[var(--ts-accent)]">
              AHEAD OF PB
            </span>
          )}
        </div>
        {active && lapNum != null && (
          <span className="font-[family-name:var(--ts-font-mono)] text-xs text-[var(--ts-muted)]">
            Lap {lapNum}
            {raceTime != null ? ` · Race ${formatLapTime(raceTime)}` : ""}
          </span>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto_auto_1fr] md:items-end">
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
            SESSION Δ{telemetry?.deltaAligned ? " · same point" : ""}
          </div>
          <div
            className="font-[family-name:var(--ts-font-mono)] text-xl font-semibold tabular-nums"
            style={{ color: deltaColor }}
          >
            {formatDelta(delta)}
          </div>
        </div>

        <div className="text-center md:pb-1">
          <div className="mb-1 text-[10px] tracking-wider text-[var(--ts-muted)]">
            CLASS GHOST{telemetry?.ghostAligned ? " · same point" : ""}
          </div>
          <div
            className="font-[family-name:var(--ts-font-mono)] text-xl font-semibold tabular-nums"
            style={{ color: ghostColor }}
          >
            {formatDelta(ghost)}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 md:text-right">
          <div>
            <div className="mb-1 text-[10px] tracking-wider text-[var(--ts-muted)]">LAST</div>
            <div className="font-[family-name:var(--ts-font-mono)] text-lg font-medium tabular-nums text-[var(--ts-text)]">
              {formatLapTime(last)}
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] tracking-wider text-[var(--ts-muted)]">SESSION BEST</div>
            <div
              className="font-[family-name:var(--ts-font-mono)] text-lg font-semibold tabular-nums"
              style={{ color: "var(--ts-accent)" }}
            >
              {formatLapTime(best)}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--ts-border)] pt-3 sm:grid-cols-4">
        <div>
          <div className="mb-1 text-[10px] tracking-wider text-[var(--ts-muted)]">
            CLASS {classLabel} BEST
          </div>
          <div className="font-[family-name:var(--ts-font-mono)] text-base font-semibold tabular-nums text-[var(--ts-text)]">
            {formatLapTime(classBest)}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] tracking-wider text-[var(--ts-muted)]">CAR BEST</div>
          <div className="font-[family-name:var(--ts-font-mono)] text-base font-semibold tabular-nums text-[var(--ts-text)]">
            {formatLapTime(carBest)}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] tracking-wider text-[var(--ts-muted)]">LAP TOP SPEED</div>
          <div className="font-[family-name:var(--ts-font-mono)] text-base font-semibold tabular-nums text-[var(--ts-text)]">
            {formatSpeedKmh(lapTop, units)}
          </div>
        </div>
        <div>
          <div className="mb-1 text-[10px] tracking-wider text-[var(--ts-muted)]">RACE TIME</div>
          <div className="font-[family-name:var(--ts-font-mono)] text-base font-semibold tabular-nums text-[var(--ts-text)]">
            {formatLapTime(raceTime)}
          </div>
        </div>
      </div>

      {!active && (
        <p className="mt-4 text-xs text-[var(--ts-muted)]">
          Start a race or time trial in Forza — session delta and class ghost appear after you have a
          reference lap.
        </p>
      )}
    </Card>
  );
}

function HudCell({
  label,
  value,
  color,
  accent,
  large,
}: {
  label: string;
  value: string;
  color?: string;
  accent?: boolean;
  large?: boolean;
}) {
  return (
    <div>
      <div className="text-[9px] tracking-wider text-[var(--ts-muted)]">{label}</div>
      <div
        className={[
          "font-[family-name:var(--ts-font-mono)] font-semibold tabular-nums leading-tight",
          large ? "text-xl" : "text-sm",
        ].join(" ")}
        style={{ color: color ?? (accent ? "var(--ts-accent)" : "var(--ts-text)") }}
      >
        {value}
      </div>
    </div>
  );
}

import { useEffect, useRef, useMemo } from "react";

import { LiveTrackMap } from "./LiveTrackMap";
import { Button } from "../ui/Button";
import { TuneActionButtons } from "../tune/TuneActionButtons";
import { computeTunePages } from "../../lib/tuneFromConfig";
import type { TuneConfig } from "../tune/TuneInputScreen";
import { formatDelta, formatLapTime } from "../../lib/lapTime";
import { formatSpeedKmh, type TuneUnits } from "../../lib/units";

import type { BalanceState, TelemetryFrame } from "../../lib/telemetry";
import { getClassLabel, getGearLabel } from "../../lib/telemetry";
import { SessionTimingSheet } from "./SessionTimingSheet";
import { LivePbAlert } from "./LivePbAlert";
import { TrackLabelEditor } from "./TrackLabelEditor";
import { updateActiveSession } from "../../lib/sessions";

const C = {
  cold: "#737373",
  optimal: "#34d399",
  hot: "#FF2800",
};

function tireColor(temp: number) {
  if (temp < 60) return C.cold;
  if (temp < 85) return C.optimal;
  if (temp < 100) return "#fbbf24";
  return C.hot;
}

function slipColor(slip: number) {
  if (slip < 0.15) return C.optimal;
  if (slip < 0.5) return "#fbbf24";
  return "var(--ts-danger)";
}

function BalanceBadge({ balance }: { balance: BalanceState }) {
  const labels: Record<BalanceState, string> = {
    neutral: "NEUTRAL",
    understeer: "UNDERSTEER",
    oversteer: "OVERSTEER",
  };
  const colors: Record<BalanceState, string> = {
    neutral: "var(--ts-muted)",
    understeer: "#fbbf24",
    oversteer: "var(--ts-danger)",
  };
  return (
    <span
      className="rounded px-2 py-0.5 text-[10px] font-semibold tracking-wide"
      style={{ color: colors[balance], background: `${colors[balance]}22` }}
    >
      {labels[balance]}
    </span>
  );
}

function HudTire({
  label,
  temp,
  slip,
  className = "",
}: {
  label: string;
  temp: number;
  slip: number;
  className?: string;
}) {
  return (
    <div
      className={[
        "min-w-[72px] rounded-lg border border-[var(--ts-border)] bg-[var(--ts-bg)] px-3 py-2 text-center",
        className,
      ].join(" ")}
    >
      <div className="text-[10px] font-semibold text-[var(--ts-muted)]">{label}</div>
      <div
        className="font-[family-name:var(--ts-font-mono)] text-lg font-semibold tabular-nums leading-tight"
        style={{ color: tireColor(temp) }}
      >
        {Math.round(temp)}°
      </div>
      <div
        className="font-[family-name:var(--ts-font-mono)] text-[10px] tabular-nums"
        style={{ color: slipColor(slip) }}
      >
        {(slip * 100).toFixed(0)}% slip
      </div>
    </div>
  );
}

function GForceCanvas({ telemetry, size = 128 }: { telemetry: TelemetryFrame | null; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const s = canvas.width;
    const center = s / 2;
    const maxG = 2.0;

    ctx.clearRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(center, 12);
    ctx.lineTo(center, s - 12);
    ctx.moveTo(12, center);
    ctx.lineTo(s - 12, center);
    ctx.stroke();

    [0.5, 1.0, 1.5].forEach((g) => {
      ctx.strokeStyle = g === 1.0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)";
      ctx.beginPath();
      ctx.arc(center, center, (g / maxG) * (center - 14), 0, 2 * Math.PI);
      ctx.stroke();
    });

    const xG = telemetry?.accelX ?? 0;
    const zG = telemetry?.accelZ ?? 0;
    let posX = center + (xG / maxG) * (center - 14);
    let posY = center - (zG / maxG) * (center - 14);
    const dist = Math.sqrt((posX - center) ** 2 + (posY - center) ** 2);
    if (dist > center - 12) {
      const angle = Math.atan2(posY - center, posX - center);
      posX = center + Math.cos(angle) * (center - 12);
      posY = center + Math.sin(angle) * (center - 12);
    }

    ctx.fillStyle = "var(--ts-accent)";
    ctx.shadowColor = "var(--ts-accent)";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(posX, posY, 6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [telemetry, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="block rounded-full"
      style={{ background: "rgba(255,255,255,0.04)" }}
    />
  );
}

function PedalBar({ label, value = 0, color }: { label: string; value?: number; color: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className="flex-1">
      <div className="mb-1 flex justify-between text-[10px] text-[var(--ts-muted)]">
        <span>{label}</span>
        <span className="font-[family-name:var(--ts-font-mono)] tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[var(--ts-surface)]">
        <div className="h-full rounded-full transition-all duration-75" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function LapStrip({
  telemetry,
  units,
}: {
  telemetry: TelemetryFrame | null;
  units: TuneUnits;
}) {
  const active = telemetry?.raceMode ?? false;
  const current = active ? telemetry?.lapElapsed : null;
  const delta = active ? telemetry?.lapDelta : null;
  const best = telemetry?.sessionBest ?? null;
  const classBest = telemetry?.classBest ?? null;
  const ghost = active ? telemetry?.ghostDelta : null;
  const lapTop = active ? telemetry?.lapTopSpeedKmh : null;
  const lapNum = telemetry?.lapNumber;
  const classLabel = telemetry ? getClassLabel(telemetry.carClass) : "?";
  const deltaColor =
    delta == null ? "var(--ts-muted)" : delta >= 0 ? "var(--ts-warning)" : "var(--ts-success)";
  const ghostColor =
    ghost == null ? "var(--ts-muted)" : ghost >= 0 ? "var(--ts-warning)" : "var(--ts-accent)";

  const cells = [
    {
      label: active && lapNum != null ? `LAP ${lapNum}` : "CURRENT",
      value: formatLapTime(current),
      accent: false,
      large: true,
    },
    { label: "DELTA", value: formatDelta(delta), accent: false, color: deltaColor },
    { label: "GHOST", value: formatDelta(ghost), accent: false, color: ghostColor },
    { label: "BEST", value: formatLapTime(best), accent: true },
    { label: `CLS ${classLabel}`, value: formatLapTime(classBest), accent: false },
    { label: "TOP", value: formatSpeedKmh(lapTop, units), accent: false },
  ];

  return (
    <div className="flex h-full items-stretch divide-x divide-[var(--ts-border)] rounded-lg border border-[var(--ts-border)] bg-[var(--ts-card)]">
      {cells.map((cell) => (
        <div key={cell.label} className="flex min-w-[72px] flex-1 flex-col justify-center px-3 py-2">
          <div className="text-[10px] tracking-wider text-[var(--ts-muted)]">{cell.label}</div>
          <div
            className={[
              "font-[family-name:var(--ts-font-mono)] font-semibold tabular-nums leading-tight",
              cell.large ? "text-2xl" : "text-base",
            ].join(" ")}
            style={{
              letterSpacing: "var(--ts-data-tracking)",
              color: cell.color ?? (cell.accent ? "var(--ts-accent)" : "var(--ts-text)"),
            }}
          >
            {cell.value}
          </div>
        </div>
      ))}
    </div>
  );
}

export interface LiveDrivingHudProps {
  telemetry: TelemetryFrame | null;
  units: TuneUnits;
  statusLabel: string;
  statusColor: string;
  statusDetail?: string | null;
  mockActive: boolean;
  onToggleMock: () => void;
  onQuickTune?: () => void;
  onManualTune?: () => void;
  loadedConfig?: TuneConfig | null;
  serverHost?: string;
}

function LoadedTuneStrip({ config }: { config: TuneConfig }) {
  const pages = useMemo(() => computeTunePages(config, 40, 45), [config]);
  const pick = (page: string, keyPart: string) =>
    pages[page]?.values?.find((r) => r.key.includes(keyPart))?.value ?? "—";

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-1 border-t border-[var(--ts-border)] bg-[var(--ts-card)]/80 px-4 py-1.5 text-[10px]">
      <span className="font-semibold uppercase tracking-wide text-[var(--ts-accent)]">
        {config.tuneId} tune
      </span>
      <span className="text-[var(--ts-muted)]">
        F tire <span className="text-[var(--ts-text)]">{pick("Tires", "Front Pressure")}</span>
      </span>
      <span className="text-[var(--ts-muted)]">
        R tire <span className="text-[var(--ts-text)]">{pick("Tires", "Rear Pressure")}</span>
      </span>
      <span className="text-[var(--ts-muted)]">
        F spring <span className="text-[var(--ts-text)]">{pick("Springs", "Front Spring")}</span>
      </span>
      <span className="text-[var(--ts-muted)]">
        R spring <span className="text-[var(--ts-text)]">{pick("Springs", "Rear Spring")}</span>
      </span>
    </div>
  );
}

export function LiveDrivingHud({
  telemetry,
  units,
  statusLabel,
  statusColor,
  statusDetail,
  mockActive,
  onToggleMock,
  onQuickTune,
  onManualTune,
  loadedConfig,
  serverHost = "",
}: LiveDrivingHudProps) {
  const speed = telemetry ? Math.round(telemetry.speedKmh) : 0;
  const rpm = telemetry ? Math.round(telemetry.currentEngineRpm) : 0;
  const gear = telemetry ? getGearLabel(telemetry.gear) : "N";
  const steerPct = telemetry ? Math.round(telemetry.steer * 100) : 0;

  return (
    <div className="relative flex h-full min-h-0 flex-col bg-[var(--ts-bg)]">
      <LivePbAlert alert={telemetry?.pbAlert ?? null} units={units} />
      {/* Status */}
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--ts-border)] px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{
              background: statusColor,
              boxShadow: statusColor !== "var(--ts-warning)" ? `0 0 6px ${statusColor}` : undefined,
            }}
          />
          <span className="text-xs font-medium" style={{ color: statusColor }}>
            {statusLabel}
          </span>
          {telemetry && (
            <>
              <span className="text-[var(--ts-muted)]">·</span>
              <span className="truncate text-xs text-[var(--ts-text)]">
                {telemetry.carName ||
                  (telemetry.carOrdinal > 0 ? `Car #${telemetry.carOrdinal}` : "Waiting for car…")}
              </span>
              {telemetry.trackLabel && (
                <span className="hidden truncate text-xs text-[var(--ts-muted)] xl:inline">
                  · {telemetry.trackLabel}
                </span>
              )}
              {telemetry.carOrdinal > 0 && (
                <span className="hidden shrink-0 rounded bg-[var(--ts-accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--ts-accent)] lg:inline">
                  {getClassLabel(telemetry.carClass)} {telemetry.carPerformanceIndex}
                </span>
              )}
              <BalanceBadge balance={telemetry.balance} />
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {telemetry && telemetry.carOrdinal > 0 && (
            <TuneActionButtons
              onQuickTune={onQuickTune}
              onManualTune={onManualTune}
              size="sm"
            />
          )}
          <Button variant={mockActive ? "primary" : "outline"} className="h-8 px-3 text-xs" onClick={onToggleMock}>
            {mockActive ? "Stop mock" : "Mock data"}
          </Button>
        </div>
      </header>
      {statusDetail && (
        <p className="shrink-0 border-b border-[var(--ts-border)] bg-[var(--ts-card)] px-4 py-2 text-xs leading-snug text-[var(--ts-muted)]">
          {statusDetail}
        </p>
      )}

      {loadedConfig && <LoadedTuneStrip config={loadedConfig} />}

      {/* Primary readouts */}
      <section className="grid shrink-0 grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] items-stretch gap-4 border-b border-[var(--ts-border)] px-4 py-3">
        <div className="flex items-end gap-8">
          <div>
            <div className="text-[10px] tracking-[0.2em] text-[var(--ts-muted)]">SPEED</div>
            <div className="flex items-baseline gap-2">
              <span
                className="font-[family-name:var(--ts-font-mono)] text-6xl font-semibold tabular-nums leading-none text-[var(--ts-text)]"
                style={{ letterSpacing: "var(--ts-data-tracking)" }}
              >
                {speed}
              </span>
              <span className="pb-1 text-sm text-[var(--ts-muted)]">km/h</span>
            </div>
          </div>
          <div className="flex gap-6 pb-1">
            <div>
              <div className="text-[10px] tracking-[0.2em] text-[var(--ts-muted)]">RPM</div>
              <div className="font-[family-name:var(--ts-font-mono)] text-3xl font-semibold tabular-nums">
                {rpm.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] tracking-[0.2em] text-[var(--ts-muted)]">GEAR</div>
              <div className="font-[family-name:var(--ts-font-mono)] text-3xl font-semibold tabular-nums">
                {gear}
              </div>
              {steerPct !== 0 && (
                <div className="text-[10px] text-[var(--ts-muted)]">steer {steerPct}%</div>
              )}
            </div>
          </div>
        </div>
        <LapStrip telemetry={telemetry} units={units} />
      </section>

      {/* Dashboard body */}
      <section className="grid min-h-0 flex-1 grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-3 p-3">
        <div className="flex min-h-0 flex-col overflow-hidden rounded-xl border border-[var(--ts-border)] bg-[var(--ts-card)]">
          <LiveTrackMap telemetry={telemetry} variant="fill" />
        </div>

        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex min-h-0 flex-1 flex-col rounded-xl border border-[var(--ts-border)] bg-[var(--ts-card)] p-4">
            <div className="mb-3 text-[10px] tracking-[0.16em] text-[var(--ts-muted)]">TIRES · G-FORCE</div>
            <div className="grid flex-1 grid-cols-3 grid-rows-3 place-items-center gap-2">
              <HudTire
                className="col-start-1 row-start-1"
                label="FL"
                temp={telemetry?.tireTempFL ?? 20}
                slip={telemetry?.tireSlipFL ?? 0}
              />
              <HudTire
                className="col-start-3 row-start-1"
                label="FR"
                temp={telemetry?.tireTempFR ?? 20}
                slip={telemetry?.tireSlipFR ?? 0}
              />
              <div className="col-start-2 row-start-2 flex flex-col items-center gap-1">
                <GForceCanvas telemetry={telemetry} size={128} />
                <span className="font-[family-name:var(--ts-font-mono)] text-[10px] text-[var(--ts-muted)]">
                  {telemetry ? telemetry.accelX.toFixed(2) : "0.00"}G /{" "}
                  {telemetry ? telemetry.accelZ.toFixed(2) : "0.00"}G
                </span>
              </div>
              <HudTire
                className="col-start-1 row-start-3"
                label="RL"
                temp={telemetry?.tireTempRL ?? 20}
                slip={telemetry?.tireSlipRL ?? 0}
              />
              <HudTire
                className="col-start-3 row-start-3"
                label="RR"
                temp={telemetry?.tireTempRR ?? 20}
                slip={telemetry?.tireSlipRR ?? 0}
              />
            </div>
          </div>

          <div className="shrink-0 rounded-xl border border-[var(--ts-border)] bg-[var(--ts-card)] p-4">
            <div className="mb-3 text-[10px] tracking-[0.16em] text-[var(--ts-muted)]">INPUTS</div>
            <div className="flex gap-4">
              <PedalBar label="Throttle" value={telemetry?.accelInput} color="var(--ts-accent)" />
              <PedalBar label="Brake" value={telemetry?.brakeInput} color="var(--ts-danger)" />
            </div>
          </div>

          {telemetry?.sessionId && (
            <div className="max-h-[180px] shrink-0 overflow-auto">
              <TrackLabelEditor
                compact
                trackLabel={telemetry.trackLabel}
                trackTags={telemetry.trackTags}
                onSave={async (trackLabel, trackTags) => {
                  await updateActiveSession({ trackLabel, trackTags }, serverHost);
                }}
              />
            </div>
          )}

          {(telemetry?.sessionLaps?.length ?? 0) > 0 && (
            <div className="min-h-0 max-h-[200px] shrink-0 overflow-auto">
              <SessionTimingSheet
                laps={telemetry!.sessionLaps}
                sessionBest={telemetry?.sessionBest}
                units={units}
                compact
                title="Session sheet"
                subtitle={
                  telemetry?.carName
                    ? `${telemetry.carName} · top speed per lap`
                    : "Top speed per lap"
                }
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

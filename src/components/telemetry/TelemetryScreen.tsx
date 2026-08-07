import { useEffect, useRef, useState } from "react";
import { LapTimer } from "./LapTimer";
import { LiveTrackMap } from "./LiveTrackMap";
import { LiveFineTuneBanner } from "./LiveFineTuneBanner";
import { LiveDrivingHud } from "./LiveDrivingHud";
import { FineTuneFlow } from "../tune/FineTuneFlow";
import { CarDetectBanner } from "../tune/CarDetectBanner";
import { TuneActionButtons } from "../tune/TuneActionButtons";
import type { TuneConfig } from "../tune/TuneInputScreen";
import { Card, DataValue, Label } from "../ui/Card";

import { Button } from "../ui/Button";

import { useTelemetryContext } from "../../context/TelemetryContext";

import {

  getClassLabel,

  getGearLabel,

  type BalanceState,

  type TelemetryFrame,

} from "../../lib/telemetry";



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



function GaugeCard({
  label,
  value,
  unit,
  compact,
}: {
  label: string;
  value: string;
  unit?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] px-2 py-2 text-center">
        <div className="text-[9px] uppercase tracking-wider text-[var(--ts-muted)]">{label}</div>
        <div className="font-[family-name:var(--ts-font-mono)] text-xl font-semibold tabular-nums leading-none text-[var(--ts-text)]">
          {value}
        </div>
        {unit && <div className="mt-0.5 text-[9px] text-[var(--ts-dim)]">{unit}</div>}
      </div>
    );
  }

  return (

    <div className="rounded-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-5 text-center">

      <div

        className="mb-1 text-xs tracking-wider text-white/60"

        style={{ letterSpacing: "var(--ts-label-tracking)" }}

      >

        {label}

      </div>

      <div

        className="font-[family-name:var(--ts-font-mono)] font-semibold tabular-nums text-[var(--ts-text)]"

        style={{

          fontSize: "var(--ts-data-size)",

          letterSpacing: "var(--ts-data-tracking)",

          lineHeight: 1,

        }}

      >

        {value}

      </div>

      {unit && <div className="mt-1 text-xs text-white/60">{unit}</div>}

    </div>

  );

}



function GForceCanvas({ telemetry, size = 220 }: { telemetry: TelemetryFrame | null; size?: number }) {

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

    ctx.moveTo(center, 15);

    ctx.lineTo(center, s - 15);

    ctx.moveTo(15, center);

    ctx.lineTo(s - 15, center);

    ctx.stroke();



    [0.5, 1.0, 1.5].forEach((g) => {

      ctx.strokeStyle = g === 1.0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)";

      ctx.beginPath();

      ctx.arc(center, center, (g / maxG) * (center - 20), 0, 2 * Math.PI);

      ctx.stroke();

    });



    const xG = telemetry?.accelX ?? 0;

    const zG = telemetry?.accelZ ?? 0;

    let posX = center + (xG / maxG) * (center - 20);

    let posY = center - (zG / maxG) * (center - 20);

    const dist = Math.sqrt((posX - center) ** 2 + (posY - center) ** 2);

    if (dist > center - 15) {

      const angle = Math.atan2(posY - center, posX - center);

      posX = center + Math.cos(angle) * (center - 15);

      posY = center + Math.sin(angle) * (center - 15);

    }



    ctx.fillStyle = "var(--ts-accent)";

    ctx.shadowColor = "var(--ts-accent)";

    ctx.shadowBlur = 10;

    ctx.beginPath();

    ctx.arc(posX, posY, 8, 0, 2 * Math.PI);

    ctx.fill();

    ctx.shadowBlur = 0;

  }, [telemetry, size]);



  return (

    <canvas

      ref={canvasRef}

      width={size}

      height={size}

      className="mx-auto block rounded-full"

      style={{ background: "rgba(255,255,255,0.04)" }}

    />

  );

}



function PedalBar({
  label,
  value = 0,
  color,
  compact,
}: {
  label: string;
  value?: number;
  color: string;
  compact?: boolean;
}) {
  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);
  return (
    <div className={compact ? "mb-2 last:mb-0" : "mb-3"}>
      <div className={`mb-0.5 flex justify-between ${compact ? "text-[9px]" : "text-xs"} text-[var(--ts-muted)]`}>
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className={`overflow-hidden rounded-full bg-[var(--ts-surface)] ${compact ? "h-1.5" : "h-2"}`}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
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

      className="rounded-md px-2.5 py-1 text-xs font-semibold tracking-wide"

      style={{ color: colors[balance], background: `${colors[balance]}22` }}

    >

      {labels[balance]}

    </span>

  );

}



function TireCell({
  label,
  temp,
  slip,
  compact,
}: {
  label: string;
  temp: number;
  slip: number;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-1 py-1.5 text-center">
        <div className="text-[8px] font-semibold text-[var(--ts-muted)]">{label}</div>
        <div className="font-[family-name:var(--ts-font-mono)] text-sm font-semibold tabular-nums leading-tight">
          {Math.round(temp)}
        </div>
        <div className="mx-auto mt-0.5 h-0.5 w-5 rounded-full" style={{ background: tireColor(temp) }} />
        <div className="mt-0.5 font-[family-name:var(--ts-font-mono)] text-[8px]" style={{ color: slipColor(slip) }}>
          {(slip * 100).toFixed(0)}%
        </div>
      </div>
    );
  }

  return (

    <div className="rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] p-3 text-center">

      <div className="text-[10px] text-[var(--ts-muted)]">{label}</div>

      <DataValue>{Math.round(temp)}</DataValue>

      <div className="mx-auto mt-2 h-1 w-8 rounded-full" style={{ background: tireColor(temp) }} />

      <div className="mt-1 font-[family-name:var(--ts-font-mono)] text-[10px]" style={{ color: slipColor(slip) }}>

        slip {(slip * 100).toFixed(0)}%

      </div>

    </div>

  );

}



interface TelemetryScreenProps {
  onSetup?: () => void;
  onLiveFineTune?: (problemId: string) => boolean;
  onQuickTune?: () => void;
  onManualTune?: () => void;
  loadedConfig?: TuneConfig | null;
  dismissedCarOrdinal?: number | null;
  onDismissCarDetect?: (ordinal: number) => void;
}

export function TelemetryScreen({
  onSetup,
  onLiveFineTune,
  onQuickTune,
  onManualTune,
  loadedConfig,
  dismissedCarOrdinal,
  onDismissCarDetect,
}: TelemetryScreenProps) {
  const [showFineTune, setShowFineTune] = useState(false);
  const [fineTuneProblem, setFineTuneProblem] = useState<string>("understeer");
  const [showConnection, setShowConnection] = useState(false);
  const [showCarDetect, setShowCarDetect] = useState(false);
  const lastOrdinalRef = useRef(0);

  const {
    serverIp,
    setServerIp,
    telemetry,
    wsStatus,
    mockActive,
    clientMockActive,
    isGameLive,
    serverOnline,
    toggleMock,
    suggestedIp,
    liveBalance,
    dismissLiveBalance,
  } = useTelemetryContext();

  useEffect(() => {
    if (!telemetry?.carOrdinal) {
      setShowCarDetect(false);
      return;
    }
    if (telemetry.carOrdinal === dismissedCarOrdinal) {
      setShowCarDetect(false);
      return;
    }
    if (telemetry.carOrdinal !== lastOrdinalRef.current) {
      lastOrdinalRef.current = telemetry.carOrdinal;
      setShowCarDetect(true);
    }
  }, [telemetry?.carOrdinal, dismissedCarOrdinal]);

  const detectedCarName =
    telemetry?.carName ||
    (telemetry && telemetry.carOrdinal > 0 ? `Car #${telemetry.carOrdinal}` : "");



  const statusLabel =

    wsStatus !== "connected" && !clientMockActive

      ? "Server offline"

      : mockActive

        ? "Mock data active"

        : isGameLive

          ? "Game connected"

          : "Waiting for game…";



  const statusColor =

    wsStatus !== "connected" && !clientMockActive

      ? "var(--ts-danger)"

      : mockActive || isGameLive

        ? "var(--ts-success)"

        : "var(--ts-warning)";



  const speed = telemetry ? Math.round(telemetry.speedKmh) : 0;

  const rpm = telemetry ? Math.round(telemetry.currentEngineRpm) : 0;

  const gear = telemetry ? getGearLabel(telemetry.gear) : "N";

  const steerPct = telemetry ? Math.round(telemetry.steer * 100) : 0;

  const connectionNeeded = wsStatus !== "connected" && !clientMockActive;
  const showConnectionPanel = showConnection || connectionNeeded;

  const connectionPanel = (
    <Card>
      <div className="mb-2 flex items-center justify-between gap-2">
        <Label>PC Server IP</Label>
        {isGameLive && showConnectionPanel && (
          <button
            type="button"
            onClick={() => setShowConnection(false)}
            className="text-[10px] text-[var(--ts-muted)]"
          >
            Hide
          </button>
        )}
      </div>
      <input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        value={serverIp}
        onChange={(e) => setServerIp(e.target.value)}
        placeholder={suggestedIp}
        className="min-h-11 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-bg)] px-3 font-[family-name:var(--ts-font-mono)] text-base"
      />
      <p className="mt-2 text-xs text-[var(--ts-muted)]">
        iPhone on Wi‑Fi: enter your PC&apos;s IP above. Same PC or desktop: leave blank.
      </p>
      {onSetup && (
        <button type="button" onClick={onSetup} className="mt-2 text-xs text-[var(--ts-accent)]">
          How to connect →
        </button>
      )}
    </Card>
  );

  const fineTuneBanner = liveBalance && liveBalance !== "neutral" && (
    <LiveFineTuneBanner
      balance={liveBalance}
      onFineTune={() => {
        const id = liveBalance === "understeer" ? "understeer" : "oversteer";
        setFineTuneProblem(id);
        dismissLiveBalance();
        const routed = onLiveFineTune?.(id);
        if (!routed) setShowFineTune(true);
      }}
      onDismiss={dismissLiveBalance}
    />
  );

  return (
    <>
      {showFineTune && (
        <FineTuneFlow
          initialProblemId={fineTuneProblem}
          liveHint
          onClose={() => setShowFineTune(false)}
          onApplyNudge={() => {
            /* nudges apply when Fine Tune opened from Tune results */
          }}
        />
      )}

      {/* Desktop: single-screen driving HUD */}
      <div className="relative hidden h-full min-h-0 md:flex md:flex-col">
        {fineTuneBanner && <div className="absolute left-3 right-3 top-2 z-20">{fineTuneBanner}</div>}
        {!showConnectionPanel && isGameLive && (
          <button
            type="button"
            onClick={() => setShowConnection(true)}
            className="absolute bottom-3 left-3 z-20 rounded-md border border-[var(--ts-border)] bg-[var(--ts-card)] px-2 py-1 text-[10px] text-[var(--ts-muted)] hover:text-[var(--ts-text)]"
          >
            Connection
          </button>
        )}
        {showConnectionPanel && (
          <div className="absolute bottom-3 left-3 z-20 max-w-sm shadow-lg">{connectionPanel}</div>
        )}
        {showCarDetect && telemetry?.carOrdinal > 0 && onQuickTune && (
          <div className="absolute left-3 right-3 top-12 z-20">
            <CarDetectBanner
              carName={detectedCarName}
              onQuickTune={() => {
                setShowCarDetect(false);
                onQuickTune();
              }}
              onDismiss={() => {
                setShowCarDetect(false);
                onDismissCarDetect?.(telemetry.carOrdinal);
              }}
            />
          </div>
        )}
        <LiveDrivingHud
          telemetry={telemetry}
          statusLabel={statusLabel}
          statusColor={statusColor}
          mockActive={mockActive}
          onToggleMock={toggleMock}
          onQuickTune={onQuickTune}
          onManualTune={onManualTune}
          loadedConfig={loadedConfig}
        />
      </div>

      {/* Mobile: compact scrollable dashboard */}
      <div className="mx-auto max-w-[1100px] space-y-3 px-4 py-3 pb-24 sm:px-6 md:hidden">
        {fineTuneBanner}

        {showCarDetect && telemetry?.carOrdinal > 0 && onQuickTune && (
          <CarDetectBanner
            carName={detectedCarName}
            onQuickTune={() => {
              setShowCarDetect(false);
              onQuickTune();
            }}
            onDismiss={() => {
              setShowCarDetect(false);
              onDismissCarDetect?.(telemetry.carOrdinal);
            }}
          />
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="font-[family-name:var(--ts-font-heading)] text-lg font-semibold tracking-tight">
              Live
            </h1>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px]">
              <span
                className="inline-block h-1.5 w-1.5 shrink-0 rounded-full"
                style={{
                  background: statusColor,
                  boxShadow: mockActive || isGameLive ? `0 0 6px ${statusColor}` : undefined,
                }}
              />
              <span className="truncate" style={{ color: statusColor }}>
                {statusLabel}
                {!mockActive && serverOnline === false && wsStatus !== "connected" && (
                  <span className="text-[var(--ts-muted)]"> · START.bat on PC</span>
                )}
              </span>
            </div>
          </div>
          <Button variant={mockActive ? "primary" : "outline"} className="h-8 shrink-0 px-2.5 text-[11px]" onClick={toggleMock}>
            {mockActive ? "Stop mock" : "Test mock"}
          </Button>
        </div>

        {/* Connection — collapsed when live/mock; expandable */}
        {connectionNeeded || showConnection ? (
          <Card className="!p-3">
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="font-[family-name:var(--ts-font-mono)] text-[10px] uppercase tracking-wider text-[var(--ts-muted)]">
                PC server IP
              </span>
              {isGameLive && (
                <button type="button" onClick={() => setShowConnection(false)} className="text-[10px] text-[var(--ts-muted)]">
                  Hide
                </button>
              )}
            </div>
            <input
              type="text"
              inputMode="decimal"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              value={serverIp}
              onChange={(e) => setServerIp(e.target.value)}
              placeholder={suggestedIp}
              className="min-h-9 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-bg)] px-2.5 font-[family-name:var(--ts-font-mono)] text-sm"
            />
            {onSetup && (
              <button type="button" onClick={onSetup} className="mt-1.5 text-[10px] text-[var(--ts-accent)]">
                How to connect →
              </button>
            )}
          </Card>
        ) : (
          <button
            type="button"
            onClick={() => setShowConnection(true)}
            className="flex w-full items-center justify-between rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-card)] px-3 py-2 text-left text-[10px] text-[var(--ts-muted)]"
          >
            <span>Server · {serverIp || "localhost"}</span>
            <span className="text-[var(--ts-accent)]">Edit IP</span>
          </button>
        )}

        <div className="grid grid-cols-3 gap-2">
          <GaugeCard compact label="Speed" value={String(speed)} unit="km/h" />
          <GaugeCard compact label="RPM" value={String(rpm)} unit="rpm" />
          <GaugeCard compact label="Gear" value={gear} unit={steerPct !== 0 ? `str ${steerPct}%` : undefined} />
        </div>

        <div className="rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-2.5">
          <LapTimer telemetry={telemetry} variant="hud" />
        </div>

        {telemetry && telemetry.carOrdinal > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] px-2.5 py-2">
            <span className="min-w-0 flex-1 truncate text-xs font-medium">
              {telemetry.carName || `Car #${telemetry.carOrdinal}`}
            </span>
            <BalanceBadge balance={telemetry.balance} />
            <span className="rounded bg-[var(--ts-accent-soft)] px-1.5 py-0.5 font-[family-name:var(--ts-font-mono)] text-[10px] font-semibold text-[var(--ts-accent)]">
              {getClassLabel(telemetry.carClass)} {telemetry.carPerformanceIndex}
            </span>
            {(onQuickTune || onManualTune) && (
              <TuneActionButtons onQuickTune={onQuickTune} onManualTune={onManualTune} size="sm" />
            )}
          </div>
        )}

        <LiveTrackMap telemetry={telemetry} variant="compact" />

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-2">
            <div className="mb-1.5 text-[9px] uppercase tracking-wider text-[var(--ts-muted)]">G-Force</div>
            <GForceCanvas telemetry={telemetry} size={120} />
            <p className="mt-1 text-center font-[family-name:var(--ts-font-mono)] text-[9px] text-[var(--ts-dim)]">
              {telemetry ? telemetry.accelX.toFixed(2) : "0.00"} / {telemetry ? telemetry.accelZ.toFixed(2) : "0.00"}G
            </p>
          </div>
          <div className="rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-2">
            <div className="mb-1.5 text-[9px] uppercase tracking-wider text-[var(--ts-muted)]">Inputs</div>
            <PedalBar compact label="Throttle" value={telemetry?.accelInput} color="var(--ts-accent)" />
            <PedalBar compact label="Brake" value={telemetry?.brakeInput} color="var(--ts-danger)" />
          </div>
        </div>

        <div className="rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-2.5">
          <div className="mb-2 text-[9px] uppercase tracking-wider text-[var(--ts-muted)]">Tires °C · slip</div>
          <div className="grid grid-cols-4 gap-1.5">
            <TireCell compact label="FL" temp={telemetry?.tireTempFL ?? 20} slip={telemetry?.tireSlipFL ?? 0} />
            <TireCell compact label="FR" temp={telemetry?.tireTempFR ?? 20} slip={telemetry?.tireSlipFR ?? 0} />
            <TireCell compact label="RL" temp={telemetry?.tireTempRL ?? 20} slip={telemetry?.tireSlipRL ?? 0} />
            <TireCell compact label="RR" temp={telemetry?.tireTempRR ?? 20} slip={telemetry?.tireSlipRR ?? 0} />
          </div>
        </div>
      </div>
    </>
  );
}



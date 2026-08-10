import { useEffect, useRef, useState } from "react";
import { LapTimer } from "./LapTimer";
import { LiveTrackMap } from "./LiveTrackMap";
import { LiveFineTuneBanner } from "./LiveFineTuneBanner";
import { LiveDrivingHud } from "./LiveDrivingHud";
import { SessionTimingSheet } from "./SessionTimingSheet";
import { LivePbAlert } from "./LivePbAlert";
import { TrackLabelEditor } from "./TrackLabelEditor";
import { FineTuneFlow } from "../tune/FineTuneFlow";
import { CarDetectBanner } from "../tune/CarDetectBanner";
import { TuneActionButtons, TuneActionHint } from "../tune/TuneActionButtons";
import type { TuneConfig } from "../tune/TuneInputScreen";
import { Card, DataValue, Label } from "../ui/Card";

import { Button } from "../ui/Button";

import { useTelemetryContext } from "../../context/TelemetryContext";
import { useUnits } from "../../hooks/useUnits";
import { updateActiveSession } from "../../lib/sessions";

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



function GaugeCard({ label, value, unit }: { label: string; value: string; unit?: string }) {

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



function PedalBar({ label, value = 0, color }: { label: string; value?: number; color: string }) {

  const pct = Math.round(Math.min(1, Math.max(0, value)) * 100);

  return (

    <div className="mb-3">

      <div className="mb-1 flex justify-between text-xs text-[var(--ts-muted)]">

        <span>{label}</span>

        <span>{pct}%</span>

      </div>

      <div className="h-2 overflow-hidden rounded-full bg-[var(--ts-surface)]">

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

}: {

  label: string;

  temp: number;

  slip: number;

}) {

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
  const { units } = useUnits();

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
    resolveHost,
  } = useTelemetryContext();

  const host = serverIp.trim() || resolveHost();

  // Attach the loaded tune to the active PC session whenever Live is timing.
  useEffect(() => {
    if (!loadedConfig || !telemetry?.sessionId || !telemetry.raceMode) return;
    const tune = {
      tuneId: loadedConfig.tuneId,
      make: loadedConfig.make,
      model: loadedConfig.model,
      carClass: loadedConfig.carClass,
      pi: loadedConfig.pi,
      driveType: loadedConfig.driveType,
      surface: loadedConfig.surface || "Road",
    };
    const key = `${telemetry.sessionId}:${tune.tuneId}:${tune.make}:${tune.model}:${tune.pi}`;
    if ((window as unknown as { __tsTuneKey?: string }).__tsTuneKey === key) return;
    (window as unknown as { __tsTuneKey?: string }).__tsTuneKey = key;
    void updateActiveSession({ tune }, host).catch(() => {
      /* relay may be offline / mock-only */
    });
  }, [
    loadedConfig,
    telemetry?.sessionId,
    telemetry?.raceMode,
    host,
  ]);

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
          units={units}
          statusLabel={statusLabel}
          statusColor={statusColor}
          mockActive={mockActive}
          onToggleMock={toggleMock}
          onQuickTune={onQuickTune}
          onManualTune={onManualTune}
          loadedConfig={loadedConfig}
          serverHost={host}
        />
      </div>

      {/* Mobile: scrollable layout */}
      <div className="mx-auto max-w-[1100px] space-y-[var(--ts-section-gap)] px-4 py-5 pb-8 sm:px-6 md:hidden">
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

      <div className="flex flex-wrap items-start justify-between gap-4">

        <div>

          <h1

            className="font-[family-name:var(--ts-font-heading)] text-2xl font-[number:var(--ts-heading-weight)]"

            style={{ letterSpacing: "var(--ts-heading-tracking)" }}

          >

            Live

          </h1>

          <div className="mt-2 flex items-center gap-2 text-xs">

            <span

              className="inline-block h-2 w-2 rounded-full"

              style={{

                background: statusColor,

                boxShadow: mockActive || isGameLive ? `0 0 8px ${statusColor}` : undefined,

              }}

            />

            <span style={{ color: statusColor }}>{statusLabel}</span>

            {!mockActive && serverOnline === false && wsStatus !== "connected" && (

              <span className="text-[var(--ts-muted)]">· run START.bat on PC</span>

            )}

          </div>

        </div>

        <Button variant={mockActive ? "primary" : "outline"} onClick={toggleMock}>

          {mockActive ? "Stop mock" : "Test mock"}

        </Button>

      </div>



      <Card>
        <Label>PC Server IP</Label>
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
          iPhone on Wi‑Fi: enter your PC&apos;s IP above.
          Same PC or desktop: leave blank.
        </p>
        {onSetup && (
          <button
            type="button"
            onClick={onSetup}
            className="mt-2 text-xs text-[var(--ts-accent)]"
          >
            How to connect →
          </button>
        )}
      </Card>



      <div className="grid grid-cols-3 gap-3 md:gap-4">

        <GaugeCard label="SPEED" value={String(speed)} unit="km/h" />

        <GaugeCard

          label="RPM"

          value={String(rpm)}

          unit="rpm"

        />

        <GaugeCard label="GEAR" value={gear} unit={steerPct !== 0 ? `steer ${steerPct}%` : undefined} />

      </div>



      <LivePbAlert alert={telemetry?.pbAlert ?? null} units={units} />

      <LapTimer telemetry={telemetry} units={units} />

      {telemetry?.sessionId && (
        <TrackLabelEditor
          trackLabel={telemetry.trackLabel}
          trackTags={telemetry.trackTags}
          onSave={async (trackLabel, trackTags) => {
            await updateActiveSession({ trackLabel, trackTags }, host);
          }}
        />
      )}

      {(telemetry?.sessionLaps?.length ?? 0) > 0 && (
        <SessionTimingSheet
          laps={telemetry!.sessionLaps}
          sessionBest={telemetry?.sessionBest}
          units={units}
          compact
          title="Session timing sheet"
          subtitle={
            telemetry?.carName
              ? `${telemetry.carName} · top speed per lap`
              : "Top speed per lap"
          }
        />
      )}

      <LiveTrackMap telemetry={telemetry} />



      {telemetry && (

        <Card className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">

          <span className="text-sm">

            {telemetry.carName ||

              (telemetry.carOrdinal > 0 ? `Car #${telemetry.carOrdinal}` : "Waiting for car…")}

          </span>

          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="flex flex-wrap items-center gap-2">
              {telemetry.carOrdinal > 0 && (
                <TuneActionButtons
                  onQuickTune={onQuickTune}
                  onManualTune={onManualTune}
                  size="sm"
                />
              )}

              <BalanceBadge balance={telemetry.balance} />

              {telemetry.carOrdinal > 0 && (

                <span className="rounded-md bg-[var(--ts-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--ts-accent)]">

                  {getClassLabel(telemetry.carClass)} {telemetry.carPerformanceIndex}

                </span>

              )}
            </div>

            {telemetry.carOrdinal > 0 && (onQuickTune || onManualTune) && (
              <TuneActionHint />
            )}
          </div>

        </Card>

      )}



      <div className="grid gap-[var(--ts-section-gap)] md:grid-cols-2">

        <div>

          <Label>G-Force</Label>

          <div className="rounded-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-5 text-center">

            <GForceCanvas telemetry={telemetry} />

            <p className="mt-2 font-[family-name:var(--ts-font-mono)] text-xs text-[var(--ts-muted)]">

              Lat {telemetry ? telemetry.accelX.toFixed(2) : "0.00"}G · Long{" "}

              {telemetry ? telemetry.accelZ.toFixed(2) : "0.00"}G

            </p>

          </div>

        </div>

        <div className="space-y-[var(--ts-section-gap)]">

          <Card>

            <Label>Tire temps (°C) + grip</Label>

            <div className="grid grid-cols-2 gap-3">

              <TireCell label="FL" temp={telemetry?.tireTempFL ?? 20} slip={telemetry?.tireSlipFL ?? 0} />

              <TireCell label="FR" temp={telemetry?.tireTempFR ?? 20} slip={telemetry?.tireSlipFR ?? 0} />

              <TireCell label="RL" temp={telemetry?.tireTempRL ?? 20} slip={telemetry?.tireSlipRL ?? 0} />

              <TireCell label="RR" temp={telemetry?.tireTempRR ?? 20} slip={telemetry?.tireSlipRR ?? 0} />

            </div>

          </Card>

          <Card>

            <Label>Inputs</Label>

            <PedalBar label="Throttle" value={telemetry?.accelInput} color="var(--ts-accent)" />

            <PedalBar label="Brake" value={telemetry?.brakeInput} color="var(--ts-danger)" />

          </Card>

        </div>

      </div>
      </div>
    </>
  );
}



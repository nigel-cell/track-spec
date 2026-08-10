import { useEffect, useState } from "react";
import { formatLapTime } from "../../lib/lapTime";
import { formatSpeedKmh, type TuneUnits } from "../../lib/units";
import type { TelemetryFrame } from "../../lib/telemetry";

interface LivePbAlertProps {
  alert: TelemetryFrame["pbAlert"];
  units: TuneUnits;
}

export function LivePbAlert({ alert, units }: LivePbAlertProps) {
  const [visible, setVisible] = useState<TelemetryFrame["pbAlert"]>(null);

  useEffect(() => {
    if (!alert?.id) return;
    setVisible(alert);
    const t = window.setTimeout(() => setVisible(null), alert.live ? 1800 : 3200);
    return () => window.clearTimeout(t);
  }, [alert?.id]);

  if (!visible) return null;

  const title = visible.live
    ? `AHEAD OF ${visible.kinds.map((k) => k.toUpperCase()).join(" · ")}`
    : `NEW ${visible.kinds.map((k) => k.toUpperCase()).join(" · ")} BEST`;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-50 flex justify-center px-4 md:top-6">
      <div
        className="animate-[pbFlash_0.45s_ease-out] rounded-xl border px-5 py-3 shadow-lg"
        style={{
          borderColor: "var(--ts-accent-border)",
          background: "color-mix(in srgb, var(--ts-accent) 18%, var(--ts-card))",
          color: "var(--ts-text)",
        }}
      >
        <div className="text-center text-[11px] font-semibold tracking-[0.18em] text-[var(--ts-accent)]">
          {title}
        </div>
        {!visible.live && visible.timeLabel && (
          <div
            className="mt-1 text-center font-[family-name:var(--ts-font-mono)] text-2xl font-semibold tabular-nums"
            style={{ letterSpacing: "var(--ts-data-tracking)" }}
          >
            {visible.timeLabel}
          </div>
        )}
        {visible.live && visible.time != null && (
          <div className="mt-1 text-center font-[family-name:var(--ts-font-mono)] text-lg tabular-nums">
            {formatLapTime(visible.time)}
          </div>
        )}
        {visible.topSpeedKmh != null && (
          <div className="mt-0.5 text-center font-[family-name:var(--ts-font-mono)] text-[11px] text-[var(--ts-muted)]">
            Top {formatSpeedKmh(visible.topSpeedKmh, units)}
          </div>
        )}
      </div>
      <style>{`
        @keyframes pbFlash {
          0% { transform: scale(0.92); opacity: 0; }
          40% { transform: scale(1.04); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

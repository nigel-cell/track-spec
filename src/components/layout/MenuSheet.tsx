import { themes, useTheme } from "../../themes/ThemeProvider";
import type { ThemeId } from "../../themes/types";
import type { TuneUnits } from "../../lib/units";
import { IMPERIAL_UNITS, METRIC_UNITS, isMetric } from "../../lib/units";
import { Button } from "../ui/Button";

interface MenuSheetProps {
  open: boolean;
  onClose: () => void;
  onMyTunes?: () => void;
  onAiSettings?: () => void;
  onUpdates?: () => void;
  onRefresh?: () => void;
  refreshBusy?: boolean;
  updateReady?: boolean;
  units?: TuneUnits;
  onUnitsChange?: (units: TuneUnits) => void;
}

export function MenuSheet({
  open,
  onClose,
  onMyTunes,
  onAiSettings,
  onUpdates,
  onRefresh,
  refreshBusy,
  updateReady,
  units,
  onUnitsChange,
}: MenuSheetProps) {
  const { themeId, setThemeId } = useTheme();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="safe-bottom mx-auto w-full max-w-lg rounded-t-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-surface)] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--ts-border)]" />
        <h2 className="mb-1 font-[family-name:var(--ts-font-heading)] text-lg font-[number:var(--ts-heading-weight)] tracking-[var(--ts-heading-tracking)]">
          Design
        </h2>
        <p className="mb-4 text-sm text-[var(--ts-muted)]">
          Switch the entire app visual language instantly.
        </p>
        {units && onUnitsChange && (
          <>
            <h3 className="mb-2 font-[family-name:var(--ts-font-heading)] text-sm font-semibold uppercase tracking-[0.12em] text-[var(--ts-text)]">
              Tuning units
            </h3>
            <p className="mb-3 text-xs text-[var(--ts-muted)]">
              Match what you see in Forza — weight, tire pressure, springs, and speed.
            </p>
            <div className="mb-4 grid grid-cols-2 gap-2">
              {[
                {
                  id: "imperial" as const,
                  label: "Imperial",
                  sub: "lbs · psi · mph",
                  value: IMPERIAL_UNITS,
                },
                {
                  id: "metric" as const,
                  label: "Metric",
                  sub: "kg · bar · km/h",
                  value: METRIC_UNITS,
                },
              ].map((preset) => {
                const active =
                  preset.id === "metric" ? isMetric(units) : !isMetric(units);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => onUnitsChange(preset.value)}
                    className={[
                      "rounded-[var(--ts-radius-md)] border p-3 text-left transition-all",
                      active
                        ? "border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)]"
                        : "border-[var(--ts-border)] bg-[var(--ts-card)]",
                    ].join(" ")}
                  >
                    <div
                      className="font-[family-name:var(--ts-font-heading)] text-sm font-semibold"
                      style={{ color: active ? "var(--ts-accent)" : "var(--ts-text)" }}
                    >
                      {preset.label}
                    </div>
                    <div className="mt-0.5 text-[10px] text-[var(--ts-muted)]">{preset.sub}</div>
                  </button>
                );
              })}
            </div>
          </>
        )}
        <div className="mb-4 grid grid-cols-2 gap-3">
          {(Object.keys(themes) as ThemeId[]).map((id) => {
            const t = themes[id];
            const active = themeId === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setThemeId(id)}
                className={[
                  "rounded-[var(--ts-radius-md)] border p-4 text-left transition-all",
                  active
                    ? "border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)] shadow-[var(--ts-glow)]"
                    : "border-[var(--ts-border)] bg-[var(--ts-card)]",
                ].join(" ")}
              >
                <div
                  className="mb-2 h-2 w-8 rounded-full"
                  style={{ background: t.vars["--ts-accent"] }}
                />
                <div className="font-[family-name:var(--ts-font-heading)] text-base font-[number:var(--ts-heading-weight)]">
                  {t.label}
                </div>
                <div className="mt-1 text-xs text-[var(--ts-muted)]">{t.description}</div>
              </button>
            );
          })}
        </div>
        {onMyTunes && (
          <Button variant="outline" full className="mb-3" onClick={onMyTunes}>
            🏁 Saved tunes & import
          </Button>
        )}
        {onAiSettings && (
          <Button variant="outline" full className="mb-3" onClick={onAiSettings}>
            ✦ AI provider settings
          </Button>
        )}
        {onUpdates && (
          <Button
            variant={updateReady ? "primary" : "outline"}
            full
            className="mb-3"
            onClick={() => {
              onUpdates();
              onClose();
            }}
          >
            {updateReady ? "⬆ Update available" : "⬆ Update"}
          </Button>
        )}

        {onRefresh && (
          <div className="mb-3 rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-3">
            <h3 className="text-sm font-semibold text-[var(--ts-text)]">Quick refresh</h3>
            <p className="mt-1 text-xs leading-snug text-[var(--ts-muted)]">
              Reload this install. Saved tunes stay on the device.
            </p>
            <Button
              variant="outline"
              full
              className="mt-3"
              disabled={refreshBusy}
              onClick={() => {
                onRefresh();
                onClose();
              }}
            >
              {refreshBusy ? "Refreshing…" : "Refresh now"}
            </Button>
          </div>
        )}
        <Button variant="ghost" full onClick={onClose}>
          Close
        </Button>
      </div>
    </div>
  );
}

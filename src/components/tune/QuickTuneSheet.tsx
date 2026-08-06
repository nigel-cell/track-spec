import { useEffect, useState } from "react";
import { TUNE_MODES } from "../../data/constants";
import { TuneModeGrid } from "./TuneModeGrid";
import { Button } from "../ui/Button";

interface QuickTuneSheetProps {
  open: boolean;
  carLabel: string;
  defaultTuneId?: string;
  onClose: () => void;
  onConfirm: (tuneId: string) => void;
  onManual?: () => void;
}

const LAST_MODE_KEY = "tl_v1_last_tune_mode";

export function loadLastTuneMode(): string {
  try {
    return localStorage.getItem(LAST_MODE_KEY) ?? "Race";
  } catch {
    return "Race";
  }
}

export function saveLastTuneMode(tuneId: string): void {
  try {
    localStorage.setItem(LAST_MODE_KEY, tuneId);
  } catch {
    /* ignore */
  }
}

export function QuickTuneSheet({
  open,
  carLabel,
  defaultTuneId,
  onClose,
  onConfirm,
  onManual,
}: QuickTuneSheetProps) {
  const [tuneId, setTuneId] = useState(defaultTuneId ?? loadLastTuneMode());

  useEffect(() => {
    if (open) setTuneId(defaultTuneId ?? loadLastTuneMode());
  }, [open, defaultTuneId]);

  if (!open) return null;

  const mode = TUNE_MODES.find((m) => m.id === tuneId);

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="safe-bottom mx-auto w-full max-w-lg rounded-t-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-surface)] p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="font-[family-name:var(--ts-font-heading)] text-lg font-bold">Quick Tune</h2>
        <p className="mt-1 text-sm text-[var(--ts-muted)]">{carLabel}</p>
        <p className="mt-2 text-xs text-[var(--ts-dim)]">
          Uses stock specs from garage data. Pick a tune mode first.
        </p>

        <div className="mt-4">
          <TuneModeGrid value={tuneId} onChange={setTuneId} />
        </div>

        {mode && (
          <p className="mt-3 text-center text-xs" style={{ color: mode.color }}>
            {mode.label} — {mode.sub}
          </p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2">
          {onManual && (
            <Button variant="outline" onClick={onManual}>
              Manual
            </Button>
          )}
          <Button
            variant="primary"
            full={!onManual}
            className={onManual ? "" : "col-span-2"}
            onClick={() => {
              saveLastTuneMode(tuneId);
              onConfirm(tuneId);
              onClose();
            }}
          >
            Deploy Quick Tune
          </Button>
        </div>
      </div>
    </div>
  );
}

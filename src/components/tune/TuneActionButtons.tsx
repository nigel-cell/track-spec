import { Button } from "../ui/Button";

const QUICK_TUNE_TITLE = "Uses stock specs from garage data — goes straight to tune results.";
const MANUAL_TUNE_TITLE = "Opens the setup screen so you can edit weight, tires, and mode first.";

interface TuneActionButtonsProps {
  onQuickTune?: () => void;
  onManualTune?: () => void;
  /** Compact buttons for Live HUD; default for garage detail */
  size?: "sm" | "md";
  /** One-line hint under the buttons (garage + mobile Live) */
  showHint?: boolean;
  hintClassName?: string;
  className?: string;
}

export function TuneActionHint({ className = "" }: { className?: string }) {
  return (
    <p className={`text-[10px] leading-snug text-[var(--ts-muted)] ${className}`.trim()}>
      <span className="text-[var(--ts-text)]">Quick Tune</span> — stock specs, instant results.{" "}
      <span className="text-[var(--ts-text)]">Manual</span> — edit setup first.
    </p>
  );
}

export function TuneActionButtons({
  onQuickTune,
  onManualTune,
  size = "md",
  showHint = false,
  hintClassName = "",
  className = "",
}: TuneActionButtonsProps) {
  if (!onQuickTune && !onManualTune) return null;

  const btnClass = size === "sm" ? "h-8 px-3 text-xs" : "h-9 px-3 text-xs";
  const quickClass = size === "sm" ? btnClass : "h-9 px-4 text-xs";

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-2">
        {onQuickTune && (
          <Button className={quickClass} onClick={onQuickTune} title={QUICK_TUNE_TITLE}>
            Quick Tune
          </Button>
        )}
        {onManualTune && (
          <Button variant="outline" className={btnClass} onClick={onManualTune} title={MANUAL_TUNE_TITLE}>
            Manual
          </Button>
        )}
      </div>
      {showHint && <TuneActionHint className={`mt-1.5 max-w-xs ${hintClassName}`.trim()} />}
    </div>
  );
}

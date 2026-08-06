import { Button } from "../ui/Button";

interface CarDetectBannerProps {
  carName: string;
  onQuickTune: () => void;
  onDismiss: () => void;
}

export function CarDetectBanner({ carName, onQuickTune, onDismiss }: CarDetectBannerProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--ts-radius-md)] border border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)] px-4 py-3">
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--ts-accent)]">Car detected</p>
        <p className="truncate text-sm text-[var(--ts-text)]">{carName}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button className="h-8 px-3 text-xs" onClick={onQuickTune}>
          Quick Tune
        </Button>
        <button type="button" onClick={onDismiss} className="min-h-8 min-w-8 text-[var(--ts-muted)]" aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  );
}

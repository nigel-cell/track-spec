import { Button } from "../ui/Button";

interface CarDetectBannerProps {
  carName: string;
  onQuickTune: () => void;
  onDismiss: () => void;
}

export function CarDetectBanner({ carName, onQuickTune, onDismiss }: CarDetectBannerProps) {
  return (
    <div className="rounded-[var(--ts-radius-md)] border border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)] px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ts-accent)]">Car detected</p>
          <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-[var(--ts-text)]">{carName}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 min-h-8 min-w-8 text-sm text-[var(--ts-muted)]"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      <Button className="mt-2 h-8 w-full px-3 text-xs sm:w-auto" onClick={onQuickTune}>
        Quick Tune
      </Button>
    </div>
  );
}

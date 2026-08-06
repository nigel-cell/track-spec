import { listTunesForCar, type SavedTune } from "../../lib/tuneSaves";
import { TUNE_MODES } from "../../data/constants";
import { Button } from "../ui/Button";

interface CarSavedTunesProps {
  make: string;
  model: string;
  onLoad: (entry: SavedTune) => void;
  onBrowseAll?: () => void;
}

export function CarSavedTunes({ make, model, onLoad, onBrowseAll }: CarSavedTunesProps) {
  const tunes = listTunesForCar(make, model);

  if (tunes.length === 0) return null;

  return (
    <section className="rounded-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--ts-muted)]">
          My tunes for this car ({tunes.length})
        </h2>
        {onBrowseAll && (
          <button type="button" onClick={onBrowseAll} className="text-[10px] text-[var(--ts-accent)] hover:underline">
            All tunes
          </button>
        )}
      </div>
      <div className="space-y-2">
        {tunes.slice(0, 5).map((t) => {
          const accent = TUNE_MODES.find((m) => m.id === t.config.tuneId)?.color ?? "var(--ts-accent)";
          return (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.name}</p>
                <p className="text-[10px] text-[var(--ts-muted)]">
                  {t.config.tuneId} · {t.date}
                  {t.trackNote ? ` · ${t.trackNote}` : ""}
                </p>
              </div>
              <Button
                variant="outline"
                className="h-8 shrink-0 px-3 text-xs"
                style={{ borderColor: `${accent}55`, color: accent }}
                onClick={() => onLoad(t)}
              >
                Load
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}

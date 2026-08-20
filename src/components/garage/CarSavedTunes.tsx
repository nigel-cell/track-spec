import { useEffect, useState } from "react";
import { listTunesForCar, type SavedTune } from "../../lib/tuneSaves";
import {
  listStarterTunesForSlug,
  loadStarterTunes,
  starterToSavedTune,
} from "../../lib/starterTunes";
import { TUNE_MODES } from "../../data/constants";
import { buildPartsSummary } from "../../lib/buildParts";
import { Button } from "../ui/Button";

interface CarSavedTunesProps {
  make: string;
  model: string;
  slug?: string;
  onLoad: (entry: SavedTune) => void;
  onBrowseAll?: () => void;
}

function TuneRow({
  tune,
  onLoad,
  showParts,
}: {
  tune: SavedTune;
  onLoad: (entry: SavedTune) => void;
  showParts?: boolean;
}) {
  const accent = TUNE_MODES.find((m) => m.id === tune.config.tuneId)?.color ?? "var(--ts-accent)";
  return (
    <div className="flex items-center justify-between gap-3 rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{tune.name}</p>
        <p className="text-[10px] text-[var(--ts-muted)]">
          {tune.config.tuneId} · {tune.date}
          {tune.trackNote ? ` · ${tune.trackNote}` : ""}
        </p>
        {showParts ? (
          <p className="mt-0.5 text-[10px] leading-snug text-[var(--ts-dim)]">
            Buy: {buildPartsSummary(tune.config)}
          </p>
        ) : null}
      </div>
      <Button
        variant="outline"
        className="h-8 shrink-0 px-3 text-xs"
        style={{ borderColor: `${accent}55`, color: accent }}
        onClick={() => onLoad(tune)}
      >
        Load
      </Button>
    </div>
  );
}

export function CarSavedTunes({ make, model, slug, onLoad, onBrowseAll }: CarSavedTunesProps) {
  const mine = listTunesForCar(make, model);
  const [starters, setStarters] = useState<SavedTune[]>([]);

  useEffect(() => {
    let cancelled = false;
    void loadStarterTunes().then((file) => {
      if (cancelled) return;
      setStarters(listStarterTunesForSlug(file, slug).map((t, i) => starterToSavedTune(t, i)));
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (starters.length === 0 && mine.length === 0) return null;

  return (
    <div className="space-y-3">
      {starters.length > 0 && (
        <section className="rounded-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-5">
          <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-[var(--ts-muted)]">
            Track Spec tunes ({starters.length})
          </h2>
          <div className="space-y-2">
            {starters.map((t) => (
              <TuneRow key={t.id} tune={t} onLoad={onLoad} showParts />
            ))}
          </div>
        </section>
      )}

      {mine.length > 0 && (
        <section className="rounded-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-5">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--ts-muted)]">
              My tunes for this car ({mine.length})
            </h2>
            {onBrowseAll && (
              <button type="button" onClick={onBrowseAll} className="text-[10px] text-[var(--ts-accent)] hover:underline">
                All tunes
              </button>
            )}
          </div>
          <div className="space-y-2">
            {mine.slice(0, 5).map((t) => (
              <TuneRow key={t.id} tune={t} onLoad={onLoad} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

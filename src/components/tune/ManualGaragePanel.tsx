import { useEffect, useState } from "react";
import { useUnits } from "../../hooks/useUnits";
import type { ForzaGarageCar } from "../../lib/forzaGarage";
import type { SavedTune } from "../../lib/tuneSaves";
import { garageStockFigures, garageStockSource } from "../../lib/units";
import { FaceStatsBar } from "../garage/FaceStatsBar";
import { CarSavedTunes } from "../garage/CarSavedTunes";

interface ManualGaragePanelProps {
  car: ForzaGarageCar | null;
  enrich: (car: ForzaGarageCar) => Promise<ForzaGarageCar>;
  onLoadSaved?: (entry: SavedTune) => void;
  onBrowseTunes?: () => void;
}

/** Garage stock ratings + HP/torque/weight/speed, plus saved tunes for this car. */
export function ManualGaragePanel({
  car,
  enrich,
  onLoadSaved,
  onBrowseTunes,
}: ManualGaragePanelProps) {
  const { units } = useUnits();
  const [detail, setDetail] = useState<ForzaGarageCar | null>(car);

  useEffect(() => {
    if (!car) {
      setDetail(null);
      return;
    }
    setDetail(car);
    if (car.tuneSpecs) return;
    let cancelled = false;
    void enrich(car).then((full) => {
      if (!cancelled) setDetail(full);
    });
    return () => {
      cancelled = true;
    };
  }, [car, enrich]);

  if (!detail) return null;

  const figures = garageStockFigures(garageStockSource(detail), units);

  return (
    <div className="space-y-3">
      <section className="rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-4">
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h2 className="text-[10px] font-bold uppercase tracking-wide text-[var(--ts-muted)]">
            Garage stock
          </h2>
          {(detail.class || detail.pi != null) && (
            <span className="font-[family-name:var(--ts-font-mono)] text-[10px] text-[var(--ts-dim)]">
              {[detail.class, detail.pi].filter((x) => x != null).join(" ")}
            </span>
          )}
        </div>
        <FaceStatsBar car={detail} compact variant="surface" />
        {figures.length > 0 && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {figures.map((s) => (
              <div
                key={s.label}
                className="rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-2.5 py-2"
              >
                <p className="text-[9px] font-bold uppercase tracking-wide text-[var(--ts-muted)]">
                  {s.label}
                </p>
                <p className="mt-0.5 font-[family-name:var(--ts-font-mono)] text-sm font-semibold text-[var(--ts-text)]">
                  {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
                  <span className="ml-1 text-[10px] font-normal text-[var(--ts-muted)]">{s.unit}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {onLoadSaved && (
        <CarSavedTunes
          make={detail.make}
          model={detail.model}
          slug={detail.slug}
          onLoad={onLoadSaved}
          onBrowseAll={onBrowseTunes}
        />
      )}
    </div>
  );
}

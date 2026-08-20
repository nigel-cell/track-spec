import { useMemo, useState } from "react";
import {
  applyCarToForm,
  searchCars,
  type CarRecord,
} from "../../hooks/useCarDatabase";
import type { TuneUnits } from "../../lib/units";
import type { ForzaGarageCar } from "../../lib/forzaGarage";

interface CarPickerProps {
  make: string;
  model: string;
  driveType: string;
  cars: CarRecord[];
  carCount: number;
  units: TuneUnits;
  /** Garage cars pinned for quick resume (favorites first, then owned). */
  pinnedCars?: { car: ForzaGarageCar; kind: "favorite" | "owned" }[];
  lookupGarage?: (make: string, model: string) => ForzaGarageCar | null;
  measuredSlugs?: Set<string>;
  onSelect: (patch: ReturnType<typeof applyCarToForm>, meta?: { slug?: string }) => void;
}

function matchCarRecord(cars: CarRecord[], garage: ForzaGarageCar): CarRecord | null {
  const yearShort = garage.year?.slice(-2);
  return (
    cars.find(
      (c) =>
        c.make === garage.make &&
        (c.model === garage.model ||
          c.model.startsWith(garage.model) ||
          (yearShort && `${c.model} '${yearShort}` === `${garage.model} '${yearShort}`)),
    ) ?? null
  );
}

export function CarPicker({
  make,
  model,
  driveType,
  cars,
  carCount,
  units,
  pinnedCars = [],
  lookupGarage,
  measuredSlugs,
  onSelect,
}: CarPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(
    () => searchCars(cars, query, query ? undefined : make),
    [cars, query, make],
  );

  const favoriteCars = useMemo(
    () => pinnedCars.filter((p) => p.kind === "favorite").map((p) => p.car),
    [pinnedCars],
  );

  const favoriteRows = useMemo(() => {
    return favoriteCars
      .map((g) => ({ garage: g, record: matchCarRecord(cars, g) }))
      .filter((x) => x.record);
  }, [favoriteCars, cars]);

  const slugFor = (car: CarRecord, slug?: string) =>
    slug ?? lookupGarage?.(car.make, car.model.split(" '")[0])?.slug;

  const pick = (car: CarRecord, slug?: string) => {
    onSelect(applyCarToForm(car, units), { slug: slugFor(car, slug) });
    setQuery("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <div className="mb-1 flex items-center justify-between">
        <span
          className="font-[family-name:var(--ts-font-mono)] text-[10px] uppercase text-[var(--ts-muted)]"
          style={{ letterSpacing: "var(--ts-label-tracking)" }}
        >
          Car
        </span>
        {carCount > 0 && (
          <span className="font-[family-name:var(--ts-font-mono)] text-[10px] text-[var(--ts-dim)]">
            {carCount} cars
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full min-h-12 items-center gap-3 rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-card)] px-3 text-left"
        style={{ borderLeftWidth: 3, borderLeftColor: open ? "var(--ts-accent)" : "var(--ts-border)" }}
      >
        <span className="text-[var(--ts-muted)]">⊕</span>
        <span className="flex-1 truncate font-[family-name:var(--ts-font-heading)] text-base font-semibold">
          {make} {model}
        </span>
        <span className="font-[family-name:var(--ts-font-mono)] text-[10px] uppercase text-[var(--ts-accent)]">
          {driveType}
        </span>
      </button>

      {!open && pinnedCars.length > 0 && (
        <div className="mt-2 space-y-1.5">
          <div className="flex flex-wrap gap-2">
            {pinnedCars.map(({ car: g, kind }) => {
              const measured = measuredSlugs?.has(g.slug);
              const active =
                g.make === make &&
                (model === g.model || model.startsWith(g.model) || model.includes(g.model));
              return (
                <button
                  key={g.slug}
                  type="button"
                  onClick={() => {
                    const rec = matchCarRecord(cars, g);
                    if (rec) pick(rec, g.slug);
                    else {
                      onSelect(
                        {
                          make: g.make,
                          model: g.year ? `${g.model} '${String(g.year).slice(-2)}` : g.model,
                          driveType: (g.drive as "FWD" | "RWD" | "AWD") || "RWD",
                          weightDist: g.drive === "FWD" ? 63 : g.drive === "AWD" ? 53 : 47,
                          carClass: g.class,
                          pi: g.pi,
                          weight: g.weightLbs,
                        },
                        { slug: g.slug },
                      );
                    }
                  }}
                  className={[
                    "rounded-[var(--ts-radius-sm)] border px-2.5 py-1.5 text-left text-xs transition-colors",
                    active
                      ? "border-[var(--ts-accent)] bg-[var(--ts-accent-soft)] text-[var(--ts-accent)]"
                      : "border-[var(--ts-border)] text-[var(--ts-muted)] hover:border-[var(--ts-muted)] hover:text-[var(--ts-text)]",
                  ].join(" ")}
                >
                  <span className="font-[family-name:var(--ts-font-heading)] font-semibold text-[var(--ts-text)]">
                    {kind === "favorite" ? "★ " : "✓ "}
                    {g.model}
                  </span>
                  {measured && (
                    <span className="ml-1.5 font-[family-name:var(--ts-font-mono)] text-[9px] uppercase text-[var(--ts-warning)]">
                      measured
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] leading-snug text-[var(--ts-dim)]">
            Cars you have keep weight, speed, torque, springs, and build edits on this device.
          </p>
        </div>
      )}

      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] shadow-lg">
          <div className="border-b border-[var(--ts-border)] p-2">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search make or model…"
              className="min-h-10 w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-surface)] px-3 text-sm outline-none"
            />
          </div>
          {!query && favoriteRows.length > 0 && (
            <div className="border-b border-[var(--ts-border)]">
              <div className="px-4 py-2 font-[family-name:var(--ts-font-mono)] text-[10px] uppercase tracking-wider text-[var(--ts-warning)]">
                Favorites
              </div>
              <ul>
                {favoriteRows.map(({ garage, record }) => (
                  <li key={garage.slug}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm hover:bg-[var(--ts-surface)]"
                      onClick={() => pick(record!, garage.slug)}
                    >
                      <span>
                        <span className="text-[var(--ts-warning)]">★ </span>
                        <span className="text-[var(--ts-text)]">{garage.make}</span>{" "}
                        <span className="text-[var(--ts-muted)]">{garage.model}</span>
                        {measuredSlugs?.has(garage.slug) && (
                          <span className="ml-2 font-[family-name:var(--ts-font-mono)] text-[9px] uppercase text-[var(--ts-warning)]">
                            measured
                          </span>
                        )}
                      </span>
                      {garage.class && (
                        <span className="font-[family-name:var(--ts-font-mono)] text-[10px] text-[var(--ts-dim)]">
                          {garage.class}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <ul className="max-h-56 overflow-y-auto">
            {results.length === 0 && (
              <li className="px-4 py-3 text-sm text-[var(--ts-muted)]">No matches</li>
            )}
            {results.map((car) => {
              const label = car.year ? `${car.model} '${car.year.slice(-2)}` : car.model;
              return (
                <li key={`${car.make}-${car.model}-${car.year ?? ""}`}>
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm hover:bg-[var(--ts-surface)]"
                    onClick={() => pick(car)}
                  >
                    <span>
                      <span className="text-[var(--ts-text)]">{car.make}</span>{" "}
                      <span className="text-[var(--ts-muted)]">{label}</span>
                    </span>
                    {car.cls && (
                      <span className="font-[family-name:var(--ts-font-mono)] text-[10px] text-[var(--ts-dim)]">
                        {car.cls}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-[var(--ts-border)] p-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setQuery("");
              }}
              className="w-full rounded-[var(--ts-radius-sm)] py-2 text-xs text-[var(--ts-muted)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

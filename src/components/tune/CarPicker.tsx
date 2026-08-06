import { useMemo, useState } from "react";
import {
  applyCarToForm,
  searchCars,
  type CarRecord,
} from "../../hooks/useCarDatabase";
import type { TuneUnits } from "../../lib/units";

interface CarPickerProps {
  make: string;
  model: string;
  driveType: string;
  cars: CarRecord[];
  carCount: number;
  units: TuneUnits;
  onSelect: (patch: ReturnType<typeof applyCarToForm>) => void;
}

export function CarPicker({ make, model, driveType, cars, carCount, units, onSelect }: CarPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const results = useMemo(
    () => searchCars(cars, query, query ? undefined : make),
    [cars, query, make],
  );

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
                    onClick={() => {
                      onSelect(applyCarToForm(car, units));
                      setQuery("");
                      setOpen(false);
                    }}
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

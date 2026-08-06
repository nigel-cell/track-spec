import { useEffect, useState } from "react";

import type { TuneUnits } from "../lib/units";
import { IMPERIAL_UNITS, weightFromKg } from "../lib/units";

export interface CarRecord {
  make: string;
  model: string;
  year?: string;
  drive?: string;
  cls?: string;
  weight?: number;
  pi?: number;
  fd?: number;
  gears?: number[];
  ev?: boolean;
}

const WEIGHT_DIST: Record<string, number> = {
  FWD: 63,
  RWD: 47,
  AWD: 53,
};

function displayModel(car: CarRecord): string {
  return car.year ? `${car.model} '${car.year.slice(-2)}` : car.model;
}

export function findCarRecord(cars: CarRecord[], make: string, model: string): CarRecord | null {
  const short = model.split(" '")[0];
  return (
    cars.find(
      (c) =>
        c.make === make &&
        (c.model === model || c.model.startsWith(short) || displayModel(c) === model),
    ) ?? null
  );
}

export function applyCarToForm(
  car: CarRecord,
  units: TuneUnits = IMPERIAL_UNITS,
): Partial<{
  make: string;
  model: string;
  driveType: "FWD" | "RWD" | "AWD";
  weight: number;
  weightDist: number;
  pi: number;
  carClass: string;
  stockFd: number | null;
  stockGears: number[] | null;
}> {
  const drive = (car.drive ?? "AWD") as "FWD" | "RWD" | "AWD";
  const out: ReturnType<typeof applyCarToForm> = {
    make: car.make,
    model: displayModel(car),
    driveType: drive,
    weightDist: WEIGHT_DIST[drive] ?? 53,
    stockFd: car.fd ?? null,
    stockGears: car.gears ?? null,
  };

  if (car.cls) out.carClass = car.cls;
  if (car.pi && car.pi > 0) out.pi = car.pi;
  if (car.weight && car.weight > 0) out.weight = weightFromKg(car.weight, units);

  return out;
}

export function searchCars(cars: CarRecord[], query: string, makeFilter?: string): CarRecord[] {
  const q = query.trim().toLowerCase();
  let list = cars;

  if (makeFilter) {
    list = list.filter((c) => c.make === makeFilter);
  }

  if (!q) {
    return list.slice(0, 12);
  }

  return list
    .filter((c) => {
      const label = `${c.make} ${c.model} ${c.year ?? ""}`.toLowerCase();
      return label.includes(q);
    })
    .slice(0, 20);
}

export function useCarDatabase() {
  const [cars, setCars] = useState<CarRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("./cars.json");
        if (!res.ok) throw new Error("Failed to load car database");
        const data = (await res.json()) as { cars?: CarRecord[] };
        if (!cancelled) {
          setCars(data.cars ?? []);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Car database unavailable");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const makes = [...new Set(cars.map((c) => c.make))].sort();

  return { cars, makes, loading, error, count: cars.length };
}

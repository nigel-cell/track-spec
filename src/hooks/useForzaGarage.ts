import { useCallback, useEffect, useMemo, useState } from "react";
import {
  findGarageCar,
  findGarageCarByName,
  loadForzaGarage,
  loadOwnedSlugs,
  saveOwnedSlugs,
  type ForzaGarageCar,
} from "../lib/forzaGarage";

export function useForzaGarage() {
  const [cars, setCars] = useState<ForzaGarageCar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [owned, setOwned] = useState<Set<string>>(() => loadOwnedSlugs());

  useEffect(() => {
    let cancelled = false;
    void loadForzaGarage()
      .then((data) => {
        if (!cancelled) {
          setCars(data.cars);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) setError("Garage database unavailable");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggleOwned = useCallback((slug: string) => {
    setOwned((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      saveOwnedSlugs(next);
      return next;
    });
  }, []);

  const lookup = useCallback(
    (make: string, model: string) => findGarageCar(cars, make, model),
    [cars],
  );

  const lookupByName = useCallback(
    (name: string) => findGarageCarByName(cars, name),
    [cars],
  );

  const stats = useMemo(() => {
    const ownedList = cars.filter((c) => owned.has(c.slug));
    const ownedCost = ownedList.reduce((s, c) => s + (c.cost ?? 0), 0);
    const totalCost = cars.reduce((s, c) => s + (c.cost ?? 0), 0);
    return {
      owned: ownedList.length,
      total: cars.length,
      ownedCost,
      totalCost,
      missingCost: totalCost - ownedCost,
    };
  }, [cars, owned]);

  return {
    cars,
    loading,
    error,
    owned,
    toggleOwned,
    lookup,
    lookupByName,
    stats,
  };
}

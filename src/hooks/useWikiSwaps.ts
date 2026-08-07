import { useCallback, useEffect, useState } from "react";

import { findWikiCar, loadWikiSwaps, type WikiCar } from "../lib/wikiSwaps";

export function useWikiSwaps() {
  const [cars, setCars] = useState<WikiCar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    loadWikiSwaps()
      .then((file) => {
        if (!cancelled) setCars(file.cars);
      })
      .catch(() => {
        if (!cancelled) setCars([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const lookup = useCallback(
    (make: string, model: string) => (cars.length ? findWikiCar(cars, make, model) : null),
    [cars],
  );

  return { cars, loading, lookup };
}

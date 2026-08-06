import { useCallback, useEffect, useState } from "react";
import { loadCarOrdinals, lookupCarName } from "../lib/carOrdinals";

export function useCarOrdinals() {
  const [map, setMap] = useState<Map<number, string> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void loadCarOrdinals()
      .then((m) => {
        if (!cancelled) setMap(m);
      })
      .catch(() => {
        if (!cancelled) setMap(new Map());
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const lookup = useCallback(
    (ordinal: number) => lookupCarName(map, ordinal),
    [map],
  );

  return { lookup, loading, count: map?.size ?? 0 };
}

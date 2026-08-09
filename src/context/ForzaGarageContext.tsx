import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  enrichGarageCar,
  findGarageCar,
  findGarageCarByName,
  loadForzaGarageList,
  loadOwnedSlugs,
  saveOwnedSlugs,
  type ForzaGarageCar,
} from "../lib/forzaGarage";
import { loadFavoriteSlugs, saveFavoriteSlugs } from "../lib/carFavorites";

type GarageCtx = {
  cars: ForzaGarageCar[];
  loading: boolean;
  error: string | null;
  owned: Set<string>;
  toggleOwned: (slug: string) => void;
  favorites: Set<string>;
  toggleFavorite: (slug: string) => void;
  lookup: (make: string, model: string) => ForzaGarageCar | null;
  lookupByName: (name: string) => ForzaGarageCar | null;
  enrich: (car: ForzaGarageCar) => Promise<ForzaGarageCar>;
  stats: {
    owned: number;
    favorites: number;
    total: number;
    ownedCost: number;
    totalCost: number;
    missingCost: number;
  };
  /** Ensure list data is loading (safe to call many times). */
  ensureLoaded: () => void;
};

const Ctx = createContext<GarageCtx | null>(null);

export function ForzaGarageProvider({
  children,
  /** When false, wait until ensureLoaded() / Garage tab / first lookup. */
  eager = false,
}: {
  children: ReactNode;
  eager?: boolean;
}) {
  const [wanted, setWanted] = useState(eager);
  const [cars, setCars] = useState<ForzaGarageCar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [owned, setOwned] = useState<Set<string>>(() => loadOwnedSlugs());
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavoriteSlugs());

  const ensureLoaded = useCallback(() => setWanted(true), []);

  useEffect(() => {
    if (!wanted) return;
    let cancelled = false;
    setLoading(true);
    void loadForzaGarageList()
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
  }, [wanted]);

  const toggleOwned = useCallback((slug: string) => {
    setOwned((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      saveOwnedSlugs(next);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((slug: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      saveFavoriteSlugs(next);
      return next;
    });
  }, []);

  const lookup = useCallback(
    (make: string, model: string) => {
      if (!wanted) setWanted(true);
      return findGarageCar(cars, make, model);
    },
    [cars, wanted],
  );

  const lookupByName = useCallback(
    (name: string) => {
      if (!wanted) setWanted(true);
      return findGarageCarByName(cars, name);
    },
    [cars, wanted],
  );

  const enrich = useCallback((car: ForzaGarageCar) => enrichGarageCar(car), []);

  const stats = useMemo(() => {
    let ownedCount = 0;
    let ownedCost = 0;
    let totalCost = 0;
    let favoritesCount = 0;
    for (const c of cars) {
      const cost = c.cost ?? 0;
      totalCost += cost;
      if (owned.has(c.slug)) {
        ownedCount++;
        ownedCost += cost;
      }
      if (favorites.has(c.slug)) favoritesCount++;
    }
    return {
      owned: ownedCount,
      favorites: favoritesCount,
      total: cars.length,
      ownedCost,
      totalCost,
      missingCost: totalCost - ownedCost,
    };
  }, [cars, owned, favorites]);

  const value = useMemo(
    () => ({
      cars,
      loading: wanted && loading,
      error,
      owned,
      toggleOwned,
      favorites,
      toggleFavorite,
      lookup,
      lookupByName,
      enrich,
      stats,
      ensureLoaded,
    }),
    [
      cars,
      wanted,
      loading,
      error,
      owned,
      toggleOwned,
      favorites,
      toggleFavorite,
      lookup,
      lookupByName,
      enrich,
      stats,
      ensureLoaded,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useForzaGarage() {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("useForzaGarage must be used within ForzaGarageProvider");
  }
  return ctx;
}

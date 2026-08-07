import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { useBrandLogos } from "../../hooks/useBrandLogos";
import { useForzaGarage } from "../../hooks/useForzaGarage";
import { getScrollParent, useIsDesktop } from "../../hooks/useIsDesktop";
import type { ForzaGarageCar } from "../../lib/forzaGarage";
import { CarDetailView } from "./CarDetailView";
import { GarageCarCard } from "./GarageCarCard";
import { GarageCollectionBar } from "./GarageCollectionBar";
import { GarageFilters, type GarageGroup, type GarageSort, type GarageViewMode } from "./GarageFilters";
import { Card } from "../ui/Card";

const MOBILE_PAGE = 16;
const DESKTOP_PAGE = 20;
/** Only the first row should fetch heroes immediately. */
const PRIORITY_IMAGES = 8;

export function GarageScreen({
  onQuickTune,
  onManualTune,
  onLoadSaved,
  onBrowseTunes,
}: {
  onQuickTune?: (car: ForzaGarageCar) => void;
  onManualTune?: (car: ForzaGarageCar) => void;
  onLoadSaved?: (entry: import("../../lib/tuneSaves").SavedTune) => void;
  onBrowseTunes?: () => void;
}) {
  const isDesktop = useIsDesktop();
  const pageSize = isDesktop ? DESKTOP_PAGE : MOBILE_PAGE;
  const density = isDesktop ? "full" : "light";

  const { cars, loading, error, owned, toggleOwned, stats, enrich, ensureLoaded } = useForzaGarage();
  const { urlForMake } = useBrandLogos();

  useEffect(() => {
    ensureLoaded();
  }, [ensureLoaded]);

  const [view, setView] = useState<GarageViewMode>("all");
  const [group, setGroup] = useState<GarageGroup>("none");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [sort, setSort] = useState<GarageSort>("pi");
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);
  const [driveFilter, setDriveFilter] = useState<string | null>(null);
  const [makeFilter, setMakeFilter] = useState<string | null>(null);
  const [detail, setDetail] = useState<ForzaGarageCar | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [visibleCount, setVisibleCount] = useState(pageSize);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [pageSize]);

  const brandCounts = useMemo(() => {
    const map = new Map<string, { make: string; code: string | null; count: number }>();
    for (const c of cars) {
      const cur = map.get(c.make) ?? { make: c.make, code: c.logoCode ?? null, count: 0 };
      cur.count++;
      if (c.logoCode) cur.code = c.logoCode;
      map.set(c.make, cur);
    }
    return [...map.values()].sort((a, b) => a.make.localeCompare(b.make));
  }, [cars]);

  const filtered = useMemo(() => {
    let list = cars;
    const q = deferredQuery.trim().toLowerCase();

    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.make.toLowerCase().includes(q) ||
          c.model.toLowerCase().includes(q),
      );
    }
    if (view === "owned") list = list.filter((c) => owned.has(c.slug));
    if (view === "missing") list = list.filter((c) => !owned.has(c.slug));
    if (makeFilter) list = list.filter((c) => c.make === makeFilter);
    if (classFilter) list = list.filter((c) => c.class?.toUpperCase() === classFilter);
    if (rarityFilter) list = list.filter((c) => c.rarity === rarityFilter);
    if (driveFilter) list = list.filter((c) => c.drive?.toUpperCase() === driveFilter);

    return [...list].sort((a, b) => {
      if (sort === "cost") return (b.cost ?? 0) - (a.cost ?? 0);
      if (sort === "name") return a.name.localeCompare(b.name);
      return (b.pi ?? 0) - (a.pi ?? 0);
    });
  }, [cars, deferredQuery, view, owned, sort, classFilter, rarityFilter, driveFilter, makeFilter]);

  useEffect(() => {
    setVisibleCount(pageSize);
  }, [deferredQuery, view, sort, classFilter, rarityFilter, driveFilter, makeFilter, group, pageSize]);

  const visibleCars = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  const grouped = useMemo(() => {
    if (group === "none") return [{ key: "All cars", items: visibleCars }];
    const map = new Map<string, ForzaGarageCar[]>();
    for (const c of visibleCars) {
      const key =
        group === "make" ? c.make : group === "rarity" ? (c.rarity ?? "?") : (c.class ?? "?");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({ key, items }));
  }, [group, visibleCars]);

  // Infinite scroll must use AppShell <main> as root — not the window.
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || visibleCount >= filtered.length) return;
    const root = getScrollParent(el);
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((n) => Math.min(n + pageSize, filtered.length));
        }
      },
      { root: root instanceof Element ? root : null, rootMargin: "320px 0px", threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [filtered.length, visibleCount, pageSize]);

  const openDetail = useCallback(
    async (car: ForzaGarageCar) => {
      setDetail(car);
      setDetailLoading(true);
      try {
        const full = await enrich(car);
        setDetail(full);
      } finally {
        setDetailLoading(false);
      }
    },
    [enrich],
  );

  const handleQuickTune = useCallback(
    async (car: ForzaGarageCar) => {
      if (!onQuickTune) return;
      const full = await enrich(car);
      onQuickTune(full);
    },
    [enrich, onQuickTune],
  );

  const handleManualTune = useCallback(
    async (car: ForzaGarageCar) => {
      if (!onManualTune) return;
      const full = await enrich(car);
      onManualTune(full);
    },
    [enrich, onManualTune],
  );

  if (detail) {
    return (
      <CarDetailView
        car={detail}
        detailLoading={detailLoading}
        owned={owned.has(detail.slug)}
        logoUrl={urlForMake(detail.make)}
        onClose={() => setDetail(null)}
        onToggleOwned={() => toggleOwned(detail.slug)}
        onQuickTune={onQuickTune ? () => void handleQuickTune(detail) : undefined}
        onManualTune={onManualTune ? () => void handleManualTune(detail) : undefined}
        onLoadSaved={onLoadSaved}
        onBrowseTunes={onBrowseTunes}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 pb-8 sm:px-6">
      <header>
        <h1 className="font-[family-name:var(--ts-font-heading)] text-3xl font-bold tracking-tight">Garage</h1>
        <p className="mt-1 max-w-xl text-sm text-[var(--ts-muted)]">
          {isDesktop
            ? `Browse all ${stats.total} FH6 cars — costs, specs, mastery, and your collection.`
            : `Fast mobile browse of ${stats.total} FH6 cars. Tap a car for full specs & photos.`}
        </p>
      </header>

      <GarageCollectionBar
        owned={stats.owned}
        total={stats.total}
        ownedCost={stats.ownedCost}
        missingCost={stats.missingCost}
      />

      <GarageFilters
        query={query}
        onQueryChange={setQuery}
        view={view}
        onViewChange={setView}
        sort={sort}
        onSortChange={setSort}
        group={group}
        onGroupChange={setGroup}
        classFilter={classFilter}
        onClassFilter={setClassFilter}
        rarityFilter={rarityFilter}
        onRarityFilter={setRarityFilter}
        driveFilter={driveFilter}
        onDriveFilter={setDriveFilter}
        makeFilter={makeFilter}
        onMakeFilter={setMakeFilter}
        brands={brandCounts}
        urlForMake={urlForMake}
        resultCount={filtered.length}
      />

      {loading && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: isDesktop ? 12 : 6 }).map((_, i) => (
            <div
              key={i}
              className="aspect-[3/4] animate-pulse rounded-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-card)]"
            />
          ))}
        </div>
      )}

      {error && <Card className="text-sm text-[var(--ts-danger)]">{error}</Card>}

      {!loading && filtered.length === 0 && (
        <Card className="py-12 text-center text-sm text-[var(--ts-muted)]">
          No cars match your filters. Try clearing brand, class, rarity, or search.
        </Card>
      )}

      {!loading &&
        (() => {
          let imageIndex = 0;
          return grouped.map(({ key, items }) => (
            <section key={key}>
              {group !== "none" && (
                <h2 className="mb-4 flex items-center gap-2 font-[family-name:var(--ts-font-heading)] text-sm font-bold uppercase tracking-[0.14em] text-[var(--ts-muted)]">
                  {group === "make" && items[0] && (
                    <img
                      src={urlForMake(items[0].make) ?? undefined}
                      alt=""
                      className="h-5 w-5 object-contain"
                    />
                  )}
                  {key}
                  <span className="font-[family-name:var(--ts-font-mono)] text-xs font-normal normal-case">
                    {items.length}
                  </span>
                </h2>
              )}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 xl:grid-cols-5">
                {items.map((car) => {
                  const priorityImage = imageIndex < PRIORITY_IMAGES;
                  imageIndex += 1;
                  return (
                    <GarageCarCard
                      key={car.slug}
                      car={car}
                      density={density}
                      priorityImage={priorityImage}
                      owned={owned.has(car.slug)}
                      logoUrl={urlForMake(car.make)}
                      onOpen={() => void openDetail(car)}
                      onToggleOwned={(e) => {
                        e.stopPropagation();
                        toggleOwned(car.slug);
                      }}
                    />
                  );
                })}
              </div>
            </section>
          ));
        })()}

      {!loading && visibleCount < filtered.length && (
        <div ref={sentinelRef} className="py-6 text-center text-xs text-[var(--ts-muted)]">
          Showing {visibleCount} of {filtered.length} — scroll for more
        </div>
      )}

      <p className="pt-4 text-center text-xs text-[var(--ts-muted)]">
        Car data from{" "}
        <a
          href="https://forzagarage.com/"
          target="_blank"
          rel="noreferrer"
          className="text-[var(--ts-accent)] hover:underline"
        >
          forzagarage.com
        </a>
      </p>
    </div>
  );
}

import { useMemo, useState } from "react";
import { useBrandLogos } from "../../hooks/useBrandLogos";
import { useForzaGarage } from "../../hooks/useForzaGarage";
import type { ForzaGarageCar } from "../../lib/forzaGarage";
import { CarDetailView } from "./CarDetailView";
import { GarageCarCard } from "./GarageCarCard";
import { GarageCollectionBar } from "./GarageCollectionBar";
import { GarageFilters, type GarageGroup, type GarageSort, type GarageViewMode } from "./GarageFilters";
import { Card } from "../ui/Card";

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
  const { cars, loading, error, owned, toggleOwned, stats } = useForzaGarage();
  const { urlForMake } = useBrandLogos();

  const [view, setView] = useState<GarageViewMode>("all");
  const [group, setGroup] = useState<GarageGroup>("none");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<GarageSort>("pi");
  const [classFilter, setClassFilter] = useState<string | null>(null);
  const [rarityFilter, setRarityFilter] = useState<string | null>(null);
  const [driveFilter, setDriveFilter] = useState<string | null>(null);
  const [makeFilter, setMakeFilter] = useState<string | null>(null);
  const [detail, setDetail] = useState<ForzaGarageCar | null>(null);

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
    const q = query.trim().toLowerCase();

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
  }, [cars, query, view, owned, sort, classFilter, rarityFilter, driveFilter, makeFilter]);

  const grouped = useMemo(() => {
    if (group === "none") return [{ key: "All cars", items: filtered }];
    const map = new Map<string, ForzaGarageCar[]>();
    for (const c of filtered) {
      const key =
        group === "make" ? c.make : group === "rarity" ? (c.rarity ?? "?") : (c.class ?? "?");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(c);
    }
    return [...map.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, items]) => ({ key, items }));
  }, [filtered, group]);

  if (detail) {
    return (
      <CarDetailView
        car={detail}
        owned={owned.has(detail.slug)}
        logoUrl={urlForMake(detail.make)}
        onClose={() => setDetail(null)}
        onToggleOwned={() => toggleOwned(detail.slug)}
        onQuickTune={onQuickTune ? () => onQuickTune(detail) : undefined}
        onManualTune={onManualTune ? () => onManualTune(detail) : undefined}
        onLoadSaved={onLoadSaved}
        onBrowseTunes={onBrowseTunes}
      />
    );
  }

  return (
    <div className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 pb-28 sm:px-6">
      <header>
        <h1 className="font-[family-name:var(--ts-font-heading)] text-3xl font-bold tracking-tight">Garage</h1>
        <p className="mt-1 max-w-xl text-sm text-[var(--ts-muted)]">
          Browse all {stats.total} FH6 cars — costs, specs, mastery, and your collection progress.
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
          {Array.from({ length: 8 }).map((_, i) => (
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
        grouped.map(({ key, items }) => (
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((car) => (
                <GarageCarCard
                  key={car.slug}
                  car={car}
                  owned={owned.has(car.slug)}
                  logoUrl={urlForMake(car.make)}
                  onOpen={() => setDetail(car)}
                  onToggleOwned={(e) => {
                    e.stopPropagation();
                    toggleOwned(car.slug);
                  }}
                />
              ))}
            </div>
          </section>
        ))}

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

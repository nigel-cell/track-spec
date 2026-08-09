import { BrandFilter, type BrandFilterItem } from "./BrandFilter";
export type GarageViewMode = "all" | "favorites" | "owned" | "missing";
export type GarageSort = "pi" | "cost" | "name";
export type GarageGroup = "none" | "make" | "rarity" | "class";

export type { BrandFilterItem };

const CLASSES = ["D", "C", "B", "A", "S1", "S2", "R"] as const;
const RARITIES = ["Common", "Rare", "Epic", "Legendary"] as const;
const DRIVES = ["FWD", "RWD", "AWD"] as const;

interface GarageFiltersProps {
  query: string;
  onQueryChange: (q: string) => void;
  view: GarageViewMode;
  onViewChange: (v: GarageViewMode) => void;
  sort: GarageSort;
  onSortChange: (s: GarageSort) => void;
  group: GarageGroup;
  onGroupChange: (g: GarageGroup) => void;
  classFilter: string | null;
  onClassFilter: (c: string | null) => void;
  rarityFilter: string | null;
  onRarityFilter: (r: string | null) => void;
  driveFilter: string | null;
  onDriveFilter: (d: string | null) => void;
  makeFilter: string | null;
  onMakeFilter: (m: string | null) => void;
  brands: BrandFilterItem[];
  urlForMake: (make: string) => string | null;
  resultCount: number;
}

function FilterChip({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "shrink-0 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
        active
          ? "border-[var(--ts-accent)] bg-[var(--ts-accent-soft)] text-[var(--ts-accent)]"
          : "border-[var(--ts-border)] text-[var(--ts-muted)] hover:border-[var(--ts-muted)] hover:text-[var(--ts-text)]",
      ].join(" ")}
      style={active && color ? { borderColor: color, color, background: `${color}22` } : undefined}
    >
      {label}
    </button>
  );
}

export function GarageFilters({
  query,
  onQueryChange,
  view,
  onViewChange,
  sort,
  onSortChange,
  group,
  onGroupChange,
  classFilter,
  onClassFilter,
  rarityFilter,
  onRarityFilter,
  driveFilter,
  onDriveFilter,
  makeFilter,
  onMakeFilter,
  brands,
  urlForMake,
  resultCount,
}: GarageFiltersProps) {
  return (
    <div className="space-y-4 rounded-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-4">
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--ts-muted)]">⌕</span>
        <input
          type="search"
          placeholder="Search make, model, year…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          className="w-full rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-bg)] py-3 pl-10 pr-4 text-sm outline-none ring-[var(--ts-accent)] focus:ring-2"
        />
      </div>

      <div className="flex overflow-hidden rounded-[var(--ts-button-radius)] border border-[var(--ts-border)]">
        {(
          [
            { id: "all" as const, label: "All" },
            { id: "favorites" as const, label: "Favorites" },
            { id: "owned" as const, label: "Owned" },
            { id: "missing" as const, label: "Missing" },
          ] as const
        ).map(({ id, label }) => {
          const active = view === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onViewChange(id)}
              className={[
                "min-h-11 flex-1 px-2 font-[family-name:var(--ts-font-heading)] text-sm font-semibold tracking-[var(--ts-heading-tracking)] transition-colors",
                active
                  ? "bg-[var(--ts-accent)] text-white"
                  : "bg-transparent text-[var(--ts-muted)] hover:text-[var(--ts-text)]",
              ].join(" ")}
            >
              {label}
            </button>
          );
        })}
      </div>

      <BrandFilter
        brands={brands}
        selected={makeFilter}
        onSelect={onMakeFilter}
        urlForMake={urlForMake}
      />

      <div className="flex flex-wrap gap-2">
        <span className="w-full text-[10px] font-bold uppercase tracking-wide text-[var(--ts-muted)]">Class</span>
        <FilterChip label="All" active={!classFilter} onClick={() => onClassFilter(null)} />
        {CLASSES.map((c) => (
          <FilterChip
            key={c}
            label={c}
            active={classFilter === c}
            onClick={() => onClassFilter(classFilter === c ? null : c)}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="w-full text-[10px] font-bold uppercase tracking-wide text-[var(--ts-muted)]">Rarity</span>
        {RARITIES.map((r) => (
          <FilterChip
            key={r}
            label={r}
            active={rarityFilter === r}
            onClick={() => onRarityFilter(rarityFilter === r ? null : r)}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="w-full text-[10px] font-bold uppercase tracking-wide text-[var(--ts-muted)]">Drive</span>
        {DRIVES.map((d) => (
          <FilterChip key={d} label={d} active={driveFilter === d} onClick={() => onDriveFilter(driveFilter === d ? null : d)} />
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ts-border)] pt-3">
        <span className="text-xs text-[var(--ts-muted)]">
          <span className="font-[family-name:var(--ts-font-mono)] font-semibold text-[var(--ts-text)]">
            {resultCount}
          </span>{" "}
          cars
        </span>
        <div className="flex flex-wrap gap-2">
          <select
            value={group}
            onChange={(e) => onGroupChange(e.target.value as GarageGroup)}
            className="rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-bg)] px-3 py-2 text-xs font-semibold"
          >
            <option value="none">Flat list</option>
            <option value="make">By brand</option>
            <option value="rarity">By rarity</option>
            <option value="class">By class</option>
          </select>
          <select
            value={sort}
            onChange={(e) => onSortChange(e.target.value as GarageSort)}
            className="rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] bg-[var(--ts-bg)] px-3 py-2 text-xs font-semibold"
          >
            <option value="pi">PI high → low</option>
            <option value="cost">Cost high → low</option>
            <option value="name">Name A → Z</option>
          </select>
        </div>
      </div>
    </div>
  );
}

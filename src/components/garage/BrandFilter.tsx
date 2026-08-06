import { useEffect, useState } from "react";
import { BrandLogo } from "./BrandLogo";

export interface BrandFilterItem {
  make: string;
  code: string | null;
  count: number;
}

interface BrandFilterProps {
  brands: BrandFilterItem[];
  selected: string | null;
  onSelect: (make: string | null) => void;
  urlForMake: (make: string) => string | null;
}

export function BrandFilter({ brands, selected, onSelect, urlForMake }: BrandFilterProps) {
  const [open, setOpen] = useState(false);
  const selectedBrand = brands.find((b) => b.make === selected);

  // Keep open while a brand is active so the selection stays visible
  useEffect(() => {
    if (selected) setOpen(true);
  }, [selected]);

  if (brands.length === 0) return null;

  return (
    <div className="overflow-hidden rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-bg)]/30">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-[var(--ts-surface)]/50"
        aria-expanded={open}
      >
        <span
          className={[
            "text-[10px] text-[var(--ts-muted)] transition-transform",
            open ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden
        >
          ▼
        </span>

        <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--ts-muted)]">Brand</span>

        {selectedBrand ? (
          <span className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-full border border-[var(--ts-accent)]/40 bg-[var(--ts-accent-soft)] px-2 py-0.5">
            <BrandLogo
              make={selectedBrand.make}
              code={selectedBrand.code}
              url={urlForMake(selectedBrand.make)}
              size="xs"
            />
            <span className="truncate text-xs font-semibold text-[var(--ts-accent)]">{selectedBrand.make}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onSelect(null);
                }
              }}
              className="ml-auto shrink-0 text-xs text-[var(--ts-muted)] hover:text-[var(--ts-text)]"
              aria-label="Clear brand filter"
            >
              ×
            </span>
          </span>
        ) : (
          <span className="text-xs text-[var(--ts-muted)]">{brands.length} brands</span>
        )}

        <span className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-wide text-[var(--ts-muted)]">
          {open ? "Hide" : "Show"}
        </span>
      </button>

      {open && (
        <div className="border-t border-[var(--ts-border)] px-2 pb-2 pt-2">
          <div
            className={[
              "max-h-52 overflow-y-auto overflow-x-hidden",
              "flex gap-2 pb-1 md:grid md:grid-cols-[repeat(auto-fill,minmax(4.75rem,1fr))] md:gap-2",
              "max-md:overflow-x-auto max-md:overflow-y-hidden max-md:[-ms-overflow-style:none] max-md:[scrollbar-width:none] max-md:[&::-webkit-scrollbar]:hidden",
            ].join(" ")}
          >
            {brands.map(({ make, code, count }) => {
              const active = selected === make;
              return (
                <button
                  key={make}
                  type="button"
                  onClick={() => onSelect(active ? null : make)}
                  title={`${make} (${count})`}
                  className={[
                    "flex w-[4.75rem] shrink-0 flex-col items-center gap-1 rounded-[var(--ts-radius-md)] border px-2 py-2 transition-all md:w-auto",
                    active
                      ? "border-[var(--ts-accent)] bg-[var(--ts-accent-soft)] shadow-sm"
                      : "border-[var(--ts-border)] bg-[var(--ts-card)] hover:border-[var(--ts-muted)]",
                  ].join(" ")}
                >
                  <BrandLogo make={make} code={code} url={urlForMake(make)} size="filter" />
                  <span
                    className={[
                      "line-clamp-2 max-w-[72px] text-center text-[9px] font-bold uppercase leading-tight",
                      active ? "text-[var(--ts-accent)]" : "text-[var(--ts-muted)]",
                    ].join(" ")}
                  >
                    {make}
                  </span>
                  <span className="font-[family-name:var(--ts-font-mono)] text-[10px] text-[var(--ts-text)]">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

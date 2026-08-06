import type { MouseEvent } from "react";
import type { ForzaGarageCar } from "../../lib/forzaGarage";
import { carSubtitle, formatCr, rarityColor } from "../../lib/garageUi";
import { BrandLogo } from "./BrandLogo";
import { DriveBadge } from "./DriveBadge";
import { FaceStatsBar } from "./FaceStatsBar";
import { PiBadge } from "./PiBadge";

interface GarageCarCardProps {
  car: ForzaGarageCar;
  owned: boolean;
  logoUrl?: string | null;
  onOpen: () => void;
  onToggleOwned: (e: MouseEvent) => void;
}

export function GarageCarCard({ car, owned, logoUrl, onOpen, onToggleOwned }: GarageCarCardProps) {
  const accent = rarityColor(car.rarity);

  return (
    <article
      className={[
        "group relative flex flex-col overflow-hidden rounded-[var(--ts-radius-lg)] border bg-[var(--ts-card)] transition-all duration-200",
        owned
          ? "border-[var(--ts-accent)]/60 shadow-[0_0_0_1px_var(--ts-accent-soft),0_8px_24px_rgba(0,0,0,0.25)]"
          : "border-[var(--ts-border)] hover:border-[var(--ts-border)]/80 hover:shadow-lg",
      ].join(" ")}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between gap-2 border-b border-[var(--ts-border)] px-3 py-2"
        style={{ borderLeftWidth: 3, borderLeftColor: accent }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <BrandLogo make={car.make} code={car.logoCode} url={logoUrl} size="sm" />
          <span
            className="truncate text-[10px] font-bold uppercase tracking-wide"
            style={{ color: accent }}
          >
            {car.rarity ?? "Common"}
          </span>
        </div>
        <span className="inline-flex items-center gap-1 font-[family-name:var(--ts-font-mono)] text-xs font-bold">
          <img src="/garage/icons/sp-gold.webp" alt="" className="h-3.5 w-3.5" />
          {formatCr(car.cost)}
        </span>
      </div>

      <button type="button" onClick={onOpen} className="flex flex-1 flex-col text-left">
        <div className="relative aspect-[16/10] bg-gradient-to-b from-[var(--ts-surface)] to-black/50">
          {car.image ? (
            <img
              src={car.image}
              alt=""
              className="h-full w-full object-contain p-2 transition-transform duration-300 group-hover:scale-[1.03]"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-xs text-[var(--ts-muted)]">No image</div>
          )}

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-8">
            <FaceStatsBar car={car} compact />
          </div>

          <div className="absolute right-2 top-2">
            <PiBadge cls={car.class} pi={car.pi} />
          </div>

          {owned && (
            <div className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--ts-accent)] text-xs font-bold text-white shadow-md">
              ✓
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-1 p-3">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-[family-name:var(--ts-font-heading)] text-sm font-semibold leading-tight">
                {car.model}
              </h3>
              <p className="truncate text-xs text-[var(--ts-muted)]">{carSubtitle(car)}</p>
            </div>
            <DriveBadge drive={car.drive} />
          </div>
        </div>
      </button>

      <button
        type="button"
        onClick={onToggleOwned}
        className={[
          "border-t px-3 py-2.5 text-center text-[11px] font-bold uppercase tracking-[0.12em] transition-colors",
          owned
            ? "border-[var(--ts-accent)]/30 bg-[var(--ts-accent-soft)] text-[var(--ts-accent)]"
            : "border-[var(--ts-border)] text-[var(--ts-muted)] hover:bg-[var(--ts-surface)] hover:text-[var(--ts-text)]",
        ].join(" ")}
      >
        {owned ? "In garage" : "Mark owned"}
      </button>
    </article>
  );
}

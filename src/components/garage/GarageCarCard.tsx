import { memo, type MouseEvent } from "react";
import type { ForzaGarageCar } from "../../lib/forzaGarage";
import { assetUrl } from "../../lib/assetUrl";
import { carSubtitle, formatCr, rarityColor } from "../../lib/garageUi";
import { BrandLogo } from "./BrandLogo";
import { DriveBadge } from "./DriveBadge";
import { FaceStatsBar } from "./FaceStatsBar";
import { GarageHeroImage } from "./GarageHeroImage";
import { PiBadge } from "./PiBadge";

export type GarageCardDensity = "light" | "full";

interface GarageCarCardProps {
  car: ForzaGarageCar;
  owned: boolean;
  favorite?: boolean;
  logoUrl?: string | null;
  /** light = mobile (fast); full = desktop (richer). */
  density?: GarageCardDensity;
  /** First-screen heroes only — never eager-load a whole page of 75KB images. */
  priorityImage?: boolean;
  onOpen: () => void;
  onToggleOwned: (e: MouseEvent) => void;
  onToggleFavorite?: (e: MouseEvent) => void;
}

export const GarageCarCard = memo(function GarageCarCard({
  car,
  owned,
  favorite = false,
  logoUrl,
  density = "light",
  priorityImage = false,
  onOpen,
  onToggleOwned,
  onToggleFavorite,
}: GarageCarCardProps) {
  const accent = rarityColor(car.rarity);
  const full = density === "full";

  return (
    <article
      className={[
        "group relative flex flex-col overflow-hidden rounded-[var(--ts-radius-lg)] border bg-[var(--ts-card)]",
        owned
          ? "border-[var(--ts-accent)]/60 shadow-[0_0_0_1px_var(--ts-accent-soft)]"
          : "border-[var(--ts-border)]",
        full ? "hover:shadow-lg" : "",
      ].join(" ")}
    >
      <div
        className={[
          "flex items-center justify-between gap-2 border-b border-[var(--ts-border)]",
          full ? "px-3 py-2" : "px-2.5 py-1.5",
        ].join(" ")}
        style={{ borderLeftWidth: 3, borderLeftColor: accent }}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <BrandLogo
            make={car.make}
            code={car.logoCode}
            url={logoUrl ? assetUrl(logoUrl) : null}
            size={full ? "sm" : "xs"}
          />
          <span
            className="truncate text-[10px] font-bold uppercase tracking-wide"
            style={{ color: accent }}
          >
            {car.rarity ?? "Common"}
          </span>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 font-[family-name:var(--ts-font-mono)] text-[11px] font-bold">
          <img
            src={assetUrl("/garage/icons/sp-gold.webp") ?? "/garage/icons/sp-gold.webp"}
            alt=""
            className="h-3 w-3"
            width={12}
            height={12}
          />
          {formatCr(car.cost)}
        </span>
      </div>

      <button type="button" onClick={onOpen} className="flex flex-1 flex-col text-left">
        <div
          className={[
            "relative bg-gradient-to-b from-[var(--ts-surface)] to-black/40",
            full ? "aspect-[16/10]" : "aspect-[16/9]",
          ].join(" ")}
        >
          <GarageHeroImage
            src={full ? car.image || car.thumb : car.thumb || car.image}
            fallbackSrc={car.imageRemote}
            eager={priorityImage}
            className={[
              "h-full w-full object-contain",
              full ? "p-2 transition-transform duration-300 group-hover:scale-[1.03]" : "p-1.5",
            ].join(" ")}
          />

          {/* Face stats only on desktop and only when present — skip empty grids */}
          {full && car.stats && Object.keys(car.stats).length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 pt-8">
              <FaceStatsBar car={car} compact />
            </div>
          )}

          <div className={["absolute z-[1]", full ? "right-2 top-2" : "right-1.5 top-1.5"].join(" ")}>
            <PiBadge cls={car.class} pi={car.pi} />
          </div>

          <div
            className={[
              "absolute z-[1] flex items-center gap-1",
              full ? "left-2 top-2" : "left-1.5 top-1.5",
            ].join(" ")}
          >
            {owned && (
              <div
                className={[
                  "flex items-center justify-center rounded-full bg-[var(--ts-accent)] font-bold text-white",
                  full ? "h-6 w-6 text-xs" : "h-5 w-5 text-[10px]",
                ].join(" ")}
              >
                ✓
              </div>
            )}
            {favorite && (
              <div
                className={[
                  "flex items-center justify-center rounded-full bg-[var(--ts-warning)] font-bold text-black",
                  full ? "h-6 w-6 text-xs" : "h-5 w-5 text-[10px]",
                ].join(" ")}
                title="Favorite"
              >
                ★
              </div>
            )}
          </div>
        </div>

        <div className={["flex flex-1 flex-col", full ? "gap-1 p-3" : "gap-0.5 px-2.5 py-2"].join(" ")}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate font-[family-name:var(--ts-font-heading)] text-sm font-semibold leading-tight">
                {car.model}
              </h3>
              <p className="truncate text-[11px] text-[var(--ts-muted)]">
                {carSubtitle(car)}
                {!full && car.drive ? ` · ${car.drive}` : ""}
              </p>
            </div>
            {full && <DriveBadge drive={car.drive} />}
          </div>
        </div>
      </button>

      <div className="grid grid-cols-2 border-t border-[var(--ts-border)]">
        <button
          type="button"
          onClick={onToggleFavorite}
          className={[
            "text-center font-bold uppercase tracking-[0.12em]",
            full ? "px-2 py-2.5 text-[11px]" : "px-2 py-2 text-[10px]",
            favorite
              ? "bg-[var(--ts-warning)]/15 text-[var(--ts-warning)]"
              : "text-[var(--ts-muted)]",
          ].join(" ")}
        >
          {favorite ? "★ Favorite" : "☆ Favorite"}
        </button>
        <button
          type="button"
          onClick={onToggleOwned}
          className={[
            "border-l border-[var(--ts-border)] text-center font-bold uppercase tracking-[0.12em]",
            full ? "px-2 py-2.5 text-[11px]" : "px-2 py-2 text-[10px]",
            owned
              ? "bg-[var(--ts-accent-soft)] text-[var(--ts-accent)]"
              : "text-[var(--ts-muted)]",
          ].join(" ")}
        >
          {owned ? "In garage" : "Owned"}
        </button>
      </div>
    </article>
  );
});

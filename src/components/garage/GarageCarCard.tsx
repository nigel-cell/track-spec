import { memo, useEffect, useRef, useState, type MouseEvent } from "react";
import type { ForzaGarageCar } from "../../lib/forzaGarage";
import { carSubtitle, formatCr, rarityColor } from "../../lib/garageUi";
import { BrandLogo } from "./BrandLogo";
import { PiBadge } from "./PiBadge";

interface GarageCarCardProps {
  car: ForzaGarageCar;
  owned: boolean;
  logoUrl?: string | null;
  onOpen: () => void;
  onToggleOwned: (e: MouseEvent) => void;
}

/** Lightweight grid card — no face-stat grid; images only load when near viewport. */
export const GarageCarCard = memo(function GarageCarCard({
  car,
  owned,
  logoUrl,
  onOpen,
  onToggleOwned,
}: GarageCarCardProps) {
  const accent = rarityColor(car.rarity);
  const rootRef = useRef<HTMLElement | null>(null);
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !car.image) return;
    if (typeof IntersectionObserver === "undefined") {
      setShowImage(true);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShowImage(true);
          obs.disconnect();
        }
      },
      { rootMargin: "200px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [car.image]);

  return (
    <article
      ref={rootRef}
      className={[
        "group relative flex flex-col overflow-hidden rounded-[var(--ts-radius-lg)] border bg-[var(--ts-card)]",
        "content-visibility-auto",
        owned
          ? "border-[var(--ts-accent)]/60"
          : "border-[var(--ts-border)]",
      ].join(" ")}
      style={{ contentVisibility: "auto", containIntrinsicSize: "auto 240px" }}
    >
      <div
        className="flex items-center justify-between gap-2 border-b border-[var(--ts-border)] px-2.5 py-1.5"
        style={{ borderLeftWidth: 3, borderLeftColor: accent }}
      >
        <div className="flex min-w-0 items-center gap-1.5">
          <BrandLogo make={car.make} code={car.logoCode} url={logoUrl} size="xs" />
          <span className="truncate text-[10px] font-bold uppercase tracking-wide" style={{ color: accent }}>
            {car.rarity ?? "Common"}
          </span>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 font-[family-name:var(--ts-font-mono)] text-[11px] font-bold">
          <img src="/garage/icons/sp-gold.webp" alt="" className="h-3 w-3" width={12} height={12} />
          {formatCr(car.cost)}
        </span>
      </div>

      <button type="button" onClick={onOpen} className="flex flex-1 flex-col text-left">
        <div className="relative aspect-[16/9] bg-[var(--ts-surface)]">
          {showImage && car.image ? (
            <img
              src={car.image}
              alt=""
              className="h-full w-full object-contain p-1.5"
              loading="lazy"
              decoding="async"
              fetchPriority="low"
              width={320}
              height={180}
            />
          ) : (
            <div className="h-full w-full bg-[var(--ts-surface)]" />
          )}

          <div className="absolute right-1.5 top-1.5">
            <PiBadge cls={car.class} pi={car.pi} />
          </div>

          {owned && (
            <div className="absolute left-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--ts-accent)] text-[10px] font-bold text-white">
              ✓
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col gap-0.5 px-2.5 py-2">
          <h3 className="truncate font-[family-name:var(--ts-font-heading)] text-sm font-semibold leading-tight">
            {car.model}
          </h3>
          <p className="truncate text-[11px] text-[var(--ts-muted)]">
            {carSubtitle(car)}
            {car.drive ? ` · ${car.drive}` : ""}
          </p>
        </div>
      </button>

      <button
        type="button"
        onClick={onToggleOwned}
        className={[
          "border-t px-2.5 py-2 text-center text-[10px] font-bold uppercase tracking-[0.12em]",
          owned
            ? "border-[var(--ts-accent)]/30 bg-[var(--ts-accent-soft)] text-[var(--ts-accent)]"
            : "border-[var(--ts-border)] text-[var(--ts-muted)]",
        ].join(" ")}
      >
        {owned ? "In garage" : "Mark owned"}
      </button>
    </article>
  );
});

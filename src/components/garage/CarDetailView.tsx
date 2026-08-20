import { useState } from "react";
import { useUnits } from "../../hooks/useUnits";
import type { ForzaGarageCar } from "../../lib/forzaGarage";
import { garageStockFigures, garageStockSource } from "../../lib/units";
import { formatCredits } from "../../lib/forzaGarage";
import { assetUrl } from "../../lib/assetUrl";
import { carSubtitle, rarityColor } from "../../lib/garageUi";
import { Button } from "../ui/Button";
import { BrandLogo } from "./BrandLogo";
import { CarTuneSpecs } from "./CarTuneSpecs";
import { DriveBadge } from "./DriveBadge";
import { FaceStatsBar } from "./FaceStatsBar";
import { MasteryTree } from "./MasteryTree";
import { PiBadge } from "./PiBadge";
import { CarSavedTunes } from "./CarSavedTunes";
import type { SavedTune } from "../../lib/tuneSaves";
import { TuneActionButtons, TuneActionHint } from "../tune/TuneActionButtons";

type DetailTab = "overview" | "specs" | "mastery";

interface CarDetailViewProps {
  car: ForzaGarageCar;
  owned: boolean;
  favorite?: boolean;
  logoUrl?: string | null;
  detailLoading?: boolean;
  onClose: () => void;
  onToggleOwned: () => void;
  onToggleFavorite?: () => void;
  onQuickTune?: () => void;
  onManualTune?: () => void;
  onLoadSaved?: (entry: SavedTune) => void;
  onBrowseTunes?: () => void;
}

export function CarDetailView({
  car,
  owned,
  favorite = false,
  logoUrl,
  detailLoading,
  onClose,
  onToggleOwned,
  onToggleFavorite,
  onQuickTune,
  onManualTune,
  onLoadSaved,
  onBrowseTunes,
}: CarDetailViewProps) {
  const [tab, setTab] = useState<DetailTab>("overview");
  const { units } = useUnits();
  const accent = rarityColor(car.rarity);
  const figures = garageStockFigures(garageStockSource(car), units);

  const tabs: { id: DetailTab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "specs", label: "Tuning" },
  ];
  if (car.mastery?.cells?.length || detailLoading) tabs.push({ id: "mastery", label: "Mastery" });

  return (
    <div className="pb-8">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-[var(--ts-border)] bg-gradient-to-b from-[var(--ts-surface)] to-[var(--ts-bg)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            background: `radial-gradient(ellipse 80% 60% at 50% 100%, ${accent}44, transparent)`,
          }}
        />

        <div className="relative mx-auto max-w-[1000px] px-4 pt-4 sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="mb-4 inline-flex items-center gap-2 rounded-full border border-[var(--ts-border)] bg-[var(--ts-card)]/80 px-4 py-2 text-sm font-semibold backdrop-blur-sm transition-colors hover:bg-[var(--ts-card)]"
          >
            ← Garage
          </button>

          <div className="grid gap-6 pb-6 lg:grid-cols-[1.1fr_1fr] lg:items-end">
            <div>
              <div className="flex items-center gap-3">
                <BrandLogo make={car.make} code={car.logoCode} url={logoUrl} size="lg" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
                    {car.rarity} · {car.class} {car.pi}
                  </p>
                  <h1 className="mt-0.5 font-[family-name:var(--ts-font-heading)] text-2xl font-bold leading-tight sm:text-3xl">
                    {car.model}
                  </h1>
                  <p className="mt-0.5 text-sm text-[var(--ts-muted)]">{carSubtitle(car)}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--ts-border)] bg-[var(--ts-card)] px-3 py-1.5 font-[family-name:var(--ts-font-mono)] text-sm font-bold">
                  <img src="/garage/icons/sp-gold.webp" alt="" className="h-4 w-4" />
                  {formatCredits(car.cost)}
                </span>
                <DriveBadge drive={car.drive} size="md" />
                <PiBadge cls={car.class} pi={car.pi} large />
              </div>
            </div>

            {car.image && (
              <div className="relative mx-auto w-full max-w-md lg:max-w-none">
                <img
                  src={
                    assetUrl(car.image) ||
                    assetUrl(car.imageRemote) ||
                    assetUrl(car.thumb) ||
                    car.image ||
                    ""
                  }
                  alt={car.name}
                  className="mx-auto max-h-48 w-full object-contain drop-shadow-2xl sm:max-h-56"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky tabs + actions */}
      <div className="sticky top-0 z-10 border-b border-[var(--ts-border)] bg-[var(--ts-bg)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1000px] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex gap-1 rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={[
                  "rounded-md px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
                  tab === t.id
                    ? "bg-[var(--ts-accent)] text-white"
                    : "text-[var(--ts-muted)] hover:text-[var(--ts-text)]",
                ].join(" ")}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {onToggleFavorite && (
                <Button
                  variant={favorite ? "outline" : "ghost"}
                  className="h-9 px-3 text-xs"
                  onClick={onToggleFavorite}
                >
                  {favorite ? "★ Favorite" : "☆ Favorite"}
                </Button>
              )}
              <Button
                variant={owned ? "outline" : "ghost"}
                className="h-9 px-3 text-xs"
                onClick={onToggleOwned}
              >
                {owned ? "✓ Owned" : "Mark owned"}
              </Button>
              <TuneActionButtons onQuickTune={onQuickTune} onManualTune={onManualTune} />
            </div>
            {(onQuickTune || onManualTune) && (
              <TuneActionHint className="max-w-sm text-right" />
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[1000px] space-y-6 px-4 py-6 sm:px-6">
        {tab === "overview" && (
          <>
            <section className="rounded-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-5">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wide text-[var(--ts-muted)]">
                Performance ratings
              </h2>
              <FaceStatsBar car={car} />
            </section>

            {onLoadSaved && (
              <CarSavedTunes
                make={car.make}
                model={car.model}
                slug={car.slug}
                onLoad={onLoadSaved}
                onBrowseAll={onBrowseTunes}
              />
            )}

            {figures.length > 0 && (
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {figures.map((s) => (
                <div
                  key={s.label}
                  className="rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-4"
                >
                  <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--ts-muted)]">
                    {s.label}
                  </p>
                  <p className="mt-1 font-[family-name:var(--ts-font-mono)] text-2xl font-bold">
                    {s.value.toLocaleString()}
                    <span className="ml-1 text-sm font-normal text-[var(--ts-muted)]">{s.unit}</span>
                  </p>
                </div>
              ))}
            </section>
            )}

            {car.acquisition && (
              <section className="rounded-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-5">
                <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-[var(--ts-muted)]">How to get</h2>
                <p className="text-sm leading-relaxed text-[var(--ts-muted)]">{car.acquisition}</p>
              </section>
            )}
          </>
        )}

        {tab === "specs" &&
          (detailLoading && !car.tuneSpecs ? (
            <p className="py-8 text-center text-sm text-[var(--ts-muted)]">Loading tuning specs…</p>
          ) : (
            <CarTuneSpecs car={car} />
          ))}

        {tab === "mastery" &&
          (detailLoading && !car.mastery ? (
            <p className="py-8 text-center text-sm text-[var(--ts-muted)]">Loading mastery…</p>
          ) : car.mastery ? (
            <section className="rounded-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-5">
              <div className="mb-4 flex items-center justify-between gap-2">
                <h2 className="text-xs font-bold uppercase tracking-wide text-[var(--ts-muted)]">Mastery tree</h2>
                <span className="inline-flex items-center gap-1 font-[family-name:var(--ts-font-mono)] text-sm font-bold">
                  {car.mastery.totalCost ?? "—"}
                  <img src="/garage/icons/sp-gold.webp" alt="" className="h-4 w-4" /> total
                </span>
              </div>
              <MasteryTree mastery={car.mastery} />
            </section>
          ) : null)}

        <p className="text-center text-xs text-[var(--ts-muted)]">
          Data via{" "}
          <a href={car.url} target="_blank" rel="noreferrer" className="text-[var(--ts-accent)] hover:underline">
            forzagarage.com
          </a>
        </p>
      </div>
    </div>
  );
}

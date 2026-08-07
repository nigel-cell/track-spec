import type { CarPhotoStatus } from "../../lib/carPhoto";
import { useTheme } from "../../themes/ThemeProvider";

interface CarPhotoHeroProps {
  make: string;
  model: string;
  driveType: string;
  status: CarPhotoStatus;
  url: string | null;
  compact?: boolean;
  subtitle?: string;
}

export function CarPhotoHero({
  make,
  model,
  driveType,
  status,
  url,
  compact,
  subtitle,
}: CarPhotoHeroProps) {
  const { themeId } = useTheme();
  const aspect = compact ? "aspect-[3/1]" : "aspect-[2/1] sm:aspect-[16/9]";
  const shortName = model.replace(make, "").trim() || model;

  return (
    <div className="overflow-hidden rounded-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-card)]">
      <div className={`relative ${aspect} w-full overflow-hidden`}>
        {status === "loading" && <div className="absolute inset-0 shimmer" />}
        {status === "loaded" && url && (
          <img
            src={url}
            alt={`${make} ${model}`}
            className="h-full w-full object-cover"
            style={{
              filter: `brightness(var(--ts-photo-brightness)) contrast(var(--ts-photo-contrast)) saturate(var(--ts-photo-saturate))`,
            }}
          />
        )}
        {(status === "error" || status === "idle") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[var(--ts-surface)] text-[var(--ts-muted)]">
            <span className="text-3xl opacity-40">🚗</span>
            <span
              className="font-[family-name:var(--ts-font-mono)] text-[10px] uppercase"
              style={{ letterSpacing: "var(--ts-label-tracking)" }}
            >
              {make}
            </span>
          </div>
        )}
        <div className="absolute inset-0" style={{ background: "var(--ts-photo-overlay)" }} />
        {themeId === "ferrari" && status === "loaded" && (
          <div className="absolute right-4 top-4 rounded-full border border-white/20 bg-black/60 px-3 py-1 text-[10px] tracking-wider text-white/90 backdrop-blur">
            PHOTO VIA WEB
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="min-w-0 flex-1">
            <div
              className={[
                "truncate font-[family-name:var(--ts-font-heading)] font-[number:var(--ts-heading-weight)] text-white",
                compact ? "text-lg" : "text-lg sm:text-xl md:text-2xl",
              ].join(" ")}
              style={{ letterSpacing: "var(--ts-heading-tracking)" }}
            >
              {compact ? `${make} ${shortName}` : shortName || model}
            </div>
            {subtitle && (
              <div className="mt-1 truncate text-[11px] text-white/70 sm:text-xs">{subtitle}</div>
            )}
            {!compact && !subtitle && (
              <div className="mt-1 text-xs text-white/70">{driveType}</div>
            )}
          </div>
          {!compact && !subtitle && (
            <span className="hidden shrink-0 rounded-full bg-[var(--ts-accent-soft)] px-3 py-1 font-[family-name:var(--ts-font-mono)] text-xs font-medium text-[var(--ts-accent)] sm:inline">
              {driveType}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

import { faceStats, type ForzaGarageCar } from "../../lib/garageUi";

interface FaceStatsBarProps {
  car: ForzaGarageCar;
  compact?: boolean;
  /** overlay = photo chrome (white); surface = theme card text */
  variant?: "overlay" | "surface";
}

export function FaceStatsBar({ car, compact, variant = "overlay" }: FaceStatsBarProps) {
  const stats = faceStats(car);
  if (stats.length === 0) return null;
  const surface = variant === "surface";

  return (
    <div
      className={[
        "grid gap-1",
        compact ? "grid-cols-6" : "grid-cols-3 sm:grid-cols-6",
      ].join(" ")}
    >
      {stats.map(({ key, value }) => (
        <div
          key={key}
          className={[
            "rounded-md text-center",
            surface
              ? "border border-[var(--ts-border)] bg-[var(--ts-surface)]"
              : "bg-black/20 backdrop-blur-sm",
            compact ? "px-1 py-1" : "px-2 py-2",
          ].join(" ")}
        >
          <div
            className={[
              "font-[family-name:var(--ts-font-mono)] font-bold leading-none",
              surface ? "text-[var(--ts-text)]" : "text-white",
              compact ? "text-[10px]" : "text-sm",
            ].join(" ")}
          >
            {value}
          </div>
          <div
            className={[
              "font-bold uppercase",
              surface ? "text-[var(--ts-muted)]" : "text-white/60",
              compact ? "text-[8px]" : "text-[10px]",
            ].join(" ")}
          >
            {key}
          </div>
        </div>
      ))}
    </div>
  );
}

import { faceStats, type ForzaGarageCar } from "../../lib/garageUi";

interface FaceStatsBarProps {
  car: ForzaGarageCar;
  compact?: boolean;
}

export function FaceStatsBar({ car, compact }: FaceStatsBarProps) {
  const stats = faceStats(car);
  if (stats.length === 0) return null;

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
            "rounded-md bg-black/20 text-center backdrop-blur-sm",
            compact ? "px-1 py-1" : "px-2 py-2",
          ].join(" ")}
        >
          <div
            className={[
              "font-[family-name:var(--ts-font-mono)] font-bold leading-none text-white",
              compact ? "text-[10px]" : "text-sm",
            ].join(" ")}
          >
            {value}
          </div>
          <div className={["font-bold uppercase text-white/60", compact ? "text-[8px]" : "text-[10px]"].join(" ")}>
            {key}
          </div>
        </div>
      ))}
    </div>
  );
}

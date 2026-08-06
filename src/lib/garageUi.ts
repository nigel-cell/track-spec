import type { ForzaGarageCar } from "./forzaGarage";

export const RARITY_COLORS: Record<string, string> = {
  common: "#737373",
  rare: "#5fb8d6",
  epic: "#a26bff",
  legendary: "#ff8a3d",
  forza: "#ff3f34",
};

export const CLASS_COLORS: Record<string, string> = {
  D: "#737373",
  C: "#22c55e",
  B: "#3b82f6",
  A: "#a855f7",
  S1: "#f59e0b",
  S2: "#ff8a3d",
  R: "#ef4444",
  X: "#ec4899",
};

export function rarityColor(rarity: string | null | undefined): string {
  if (!rarity) return RARITY_COLORS.common;
  return RARITY_COLORS[rarity.toLowerCase()] ?? RARITY_COLORS.common;
}

export function classColor(cls: string | null | undefined): string {
  if (!cls) return "#737373";
  return CLASS_COLORS[cls.toUpperCase()] ?? "#737373";
}

export function formatCr(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString();
}

export const FACE_STAT_ORDER = ["SPD", "HND", "ACC", "BRK", "LCH", "OFF"] as const;

export function faceStats(car: ForzaGarageCar) {
  return FACE_STAT_ORDER.filter((k) => car.stats[k] != null).map((k) => ({
    key: k,
    value: car.stats[k],
  }));
}

export function carSubtitle(car: ForzaGarageCar) {
  return `${car.year} ${car.make}`;
}

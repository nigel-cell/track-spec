/** FH6 drivetrain conversions — maps wiki labels to drive type + tune deltas. */

export type DriveType = "FWD" | "RWD" | "AWD";

export const STOCK_DRIVETRAIN = "None (Stock)";

/** Typical front weight % after a conversion (or stock when garage has no figure). */
export const DRIVE_WEIGHT_DIST: Record<DriveType, number> = {
  FWD: 60,
  RWD: 47,
  AWD: 53,
};

/**
 * Approximate curb-weight change (lb) when converting from → to.
 * Symmetric so Stock → convert → Stock restores weight.
 * AWD adds a transfer case / front or rear axle (~110–130 lb).
 */
const WEIGHT_DELTA_LBS: Record<DriveType, Record<DriveType, number>> = {
  FWD: { FWD: 0, RWD: 70, AWD: 130 },
  RWD: { FWD: -70, RWD: 0, AWD: 110 },
  AWD: { FWD: -130, RWD: -110, AWD: 0 },
};

export function isStockDrivetrain(label?: string | null): boolean {
  if (!label) return true;
  return /none|stock|oem/i.test(label);
}

/** Parse wiki labels like "AWD Drivetrain", bare "AWD", or stock. */
export function parseDrivetrainSwap(label: string, stockDrive: DriveType): DriveType {
  if (isStockDrivetrain(label)) return stockDrive;
  const s = label.toLowerCase();
  if (/\bawd\b/.test(s)) return "AWD";
  if (/\brwd\b/.test(s)) return "RWD";
  if (/\bfwd\b/.test(s)) return "FWD";
  return stockDrive;
}

export function drivetrainWeightDeltaLbs(from: DriveType, to: DriveType): number {
  return WEIGHT_DELTA_LBS[from]?.[to] ?? 0;
}

export function clampWeightDist(n: number): number {
  return Math.max(35, Math.min(65, Math.round(n)));
}

export interface DrivetrainApplyInput {
  label: string;
  stockDrive: DriveType;
  currentDrive: DriveType;
  /** Current car weight in pounds (already includes any engine-swap estimate). */
  currentWeightLbs: number;
  /** OEM front % from garage / cars.json, if known. */
  stockWeightDist?: number | null;
}

export interface DrivetrainApplyResult {
  driveType: DriveType;
  weightLbs: number;
  weightDist: number;
  label: string;
}

/** Apply a drivetrain conversion relative to the car's current drive layout. */
export function applyDrivetrainConversion(input: DrivetrainApplyInput): DrivetrainApplyResult {
  const label = input.label || STOCK_DRIVETRAIN;
  const driveType = parseDrivetrainSwap(label, input.stockDrive);
  const delta = drivetrainWeightDeltaLbs(input.currentDrive, driveType);
  const weightLbs = Math.max(600, Math.round(input.currentWeightLbs + delta));

  let weightDist: number;
  if (driveType === input.stockDrive && input.stockWeightDist != null) {
    weightDist = input.stockWeightDist;
  } else {
    weightDist = DRIVE_WEIGHT_DIST[driveType];
  }

  return {
    driveType,
    weightLbs,
    weightDist: clampWeightDist(weightDist),
    label: isStockDrivetrain(label) ? STOCK_DRIVETRAIN : label,
  };
}

/** Pick the option label that yields `drive`, preferring wiki wording. */
export function labelForDrive(drive: DriveType, stockDrive: DriveType, options: string[]): string {
  if (drive === stockDrive) return STOCK_DRIVETRAIN;
  const match = options.find((o) => !isStockDrivetrain(o) && parseDrivetrainSwap(o, stockDrive) === drive);
  if (match) return match;
  return `${drive} Drivetrain`;
}

/** Stock + per-car wiki list, or common conversions when the wiki has none. */
export function drivetrainOptions(stockDrive: DriveType, wikiSwaps?: string[] | null): string[] {
  const seen = new Set<string>();
  const out: string[] = [STOCK_DRIVETRAIN];
  seen.add(STOCK_DRIVETRAIN.toLowerCase());

  const push = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed || isStockDrivetrain(trimmed)) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    // Skip options that leave the car on the same layout as stock.
    if (parseDrivetrainSwap(trimmed, stockDrive) === stockDrive) return;
    seen.add(key);
    out.push(trimmed);
  };

  if (wikiSwaps?.length) {
    for (const s of wikiSwaps) push(s);
  } else {
    if (stockDrive !== "RWD") push("RWD Drivetrain");
    if (stockDrive !== "AWD") push("AWD Drivetrain");
    if (stockDrive !== "FWD") push("FWD Drivetrain");
  }

  return out;
}

/** Per-car FH6 conversions imported from the Forza Wiki.
 *  See scripts/scrape-forza-wiki-swaps.cjs */

import type { AspirationId } from "../data/engineData";

export interface WikiCar {
  title: string;
  aspiration?: string | null;
  engine?: string | null;
  gears?: number | null;
  weightLbs?: number | null;
  engineSwaps?: string[];
  drivetrainSwaps?: string[];
  bodyKits?: string[];
  presets?: string[];
}

export interface WikiSwapFile {
  version: number;
  importedAt: string;
  source: string;
  count: number;
  withEngineSwaps: number;
  cars: WikiCar[];
}

let cache: WikiSwapFile | null = null;
let loadPromise: Promise<WikiSwapFile> | null = null;

export async function loadWikiSwaps(): Promise<WikiSwapFile> {
  if (cache) return cache;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const res = await fetch("./forzaWikiSwaps.json");
    if (!res.ok) throw new Error("Failed to load engine swap data");
    cache = (await res.json()) as WikiSwapFile;
    return cache;
  })();

  return loadPromise;
}

function norm(s: string) {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Wiki titles are "Make Model" with no year, e.g. "Nissan GT-R Black Edition (R35)". */
export function findWikiCar(cars: WikiCar[], make: string, model: string): WikiCar | null {
  const target = norm(`${make} ${model.split(" '")[0]}`);
  if (!target) return null;

  let best: WikiCar | null = null;
  let bestLen = 0;

  for (const car of cars) {
    const title = norm(car.title);
    if (title === target) return car;
    // Prefer the longest title that is fully contained in the query (or vice
    // versa) so "GT-R" doesn't win over "GT-R Black Edition (R35)".
    if ((target.includes(title) || title.includes(target)) && title.length > bestLen) {
      best = car;
      bestLen = title.length;
    }
  }

  return best;
}

export interface ParsedSwap {
  /** Original wiki label, shown in the UI. */
  name: string;
  displacementL: number | null;
  cylinders: number | null;
  /** V, I (inline), F (flat/boxer), W, R (rotary). */
  layout: string | null;
  aspiration: AspirationId;
  racing: boolean;
  motorbike: boolean;
  electric: boolean;
}

/** Wiki swap labels look like "3.8L V6-TT", "Racing 3.0L I6T", "5.0 V8 DSC",
 *  "1.6L I4 - Turbo Rally", "6.5L V12", "1.2L I3 - Motorbike Engine".
 *  Punctuation is inconsistent, so every part is matched leniently. */
export function parseSwapName(name: string): ParsedSwap {
  const lower = name.toLowerCase();

  // "4.0L", "4.0 L", and bare "3.8 F6TT" all appear.
  const displacement = name.match(/(\d+(?:\.\d+)?)\s*l\b/i) ?? name.match(/(\d+\.\d+)(?=\s)/);

  const rotor = lower.match(/(\d+)\s*rotor/);
  // No trailing \b: induction suffixes run straight into the layout (V8TT, I6T).
  const layoutMatch = name.match(/\b([VIFWR])(\d{1,2})(?!\d)/);

  let aspiration: AspirationId = "na";
  if (/electric|\bev\b/.test(lower)) aspiration = "electric";
  else if (/twin[- ]?charged/.test(lower)) aspiration = "super";
  else if (/tt\b|twin[- ]?turbo/.test(lower)) aspiration = "twin";
  // DSC/PDSC are the game's supercharger conversions.
  else if (/supercharg|p?dsc\b|centrifugal|(?:^|[^a-z])sc\b/.test(lower)) aspiration = "super";
  else if (/turbo|-\s*t\b|[a-z]?\d+t\b/.test(lower)) aspiration = "turbo";

  return {
    name,
    displacementL: displacement ? Number(displacement[1]) : null,
    cylinders: rotor ? Number(rotor[1]) : layoutMatch ? Number(layoutMatch[2]) : null,
    layout: rotor ? "R" : layoutMatch ? layoutMatch[1].toUpperCase() : null,
    aspiration,
    racing: /racing/.test(lower),
    motorbike: /motorbike/.test(lower),
    electric: aspiration === "electric",
  };
}

/** Approximate lb-ft per litre by induction — FH6 engines run richer than
 *  road-car reality, so these are tuned against in-game swap figures. */
const TORQUE_PER_LITRE: Record<AspirationId, number> = {
  na: 88,
  turbo: 132,
  twin: 145,
  super: 138,
  electric: 180,
};

export interface SwapEstimate {
  aspiration: AspirationId;
  weightLbs: number | null;
  maxTorqueLbFt: number | null;
  redlineRpm: number | null;
  peakTorqueRpm: number | null;
}

export type DriveType = "FWD" | "RWD" | "AWD";

export const DRIVE_WEIGHT_DIST: Record<DriveType, number> = { FWD: 63, RWD: 47, AWD: 53 };

/** Wiki labels: "AWD Drivetrain", "RWD Drivetrain", or bare "AWD". */
export function parseDrivetrainSwap(label: string): DriveType | null {
  const u = label.toUpperCase();
  if (u.includes("AWD")) return "AWD";
  if (u.includes("RWD")) return "RWD";
  if (u.includes("FWD")) return "FWD";
  return null;
}

export interface DrivetrainEstimate {
  driveType: DriveType;
  weightDist: number;
  weightLbs: number | null;
}

/** Estimate weight + balance after an FH6 drivetrain conversion. */
export function estimateDrivetrainConversion(
  from: DriveType,
  to: DriveType,
  stockWeightLbs?: number | null,
): DrivetrainEstimate {
  let weightLbs = stockWeightLbs ?? null;
  if (weightLbs != null && from !== to) {
    if (to === "AWD" && from !== "AWD") weightLbs += 95;
    else if (from === "AWD" && to !== "AWD") weightLbs -= 85;
    else if (to === "RWD" && from === "FWD") weightLbs -= 25;
    else if (to === "FWD" && from === "RWD") weightLbs += 15;
  }
  return { driveType: to, weightDist: DRIVE_WEIGHT_DIST[to], weightLbs };
}

/** Build dropdown options: stock + wiki conversions that change the layout. */
export function buildDrivetrainOptions(
  stockDrive: DriveType,
  wikiLabels: string[] | undefined,
): string[] {
  const stock = `Stock (${stockDrive})`;
  if (!wikiLabels?.length) return [stock];

  const seen = new Set<DriveType>([stockDrive]);
  const out = [stock];
  for (const label of wikiLabels) {
    const dt = parseDrivetrainSwap(label);
    if (dt && !seen.has(dt)) {
      seen.add(dt);
      out.push(label);
    }
  }
  return out;
}

/** Estimate the tune-relevant deltas for a wiki swap. The game does not expose
 *  these numbers anywhere machine-readable, so they are derived from
 *  displacement, induction and engine character. */
export function estimateSwap(
  parsed: ParsedSwap,
  stock: { weightLbs?: number | null; displacementCc?: number | null },
): SwapEstimate {
  const { aspiration, racing, motorbike, cylinders } = parsed;
  // A few labels ("Racing V12") omit displacement; approximate from cylinder count.
  const displacementL = parsed.displacementL ?? (cylinders ? cylinders * 0.55 : null);

  let maxTorqueLbFt: number | null = null;
  if (displacementL) {
    const perLitre = TORQUE_PER_LITRE[aspiration] * (racing ? 1.12 : 1);
    maxTorqueLbFt = Math.round(displacementL * perLitre);
  } else if (parsed.electric) {
    maxTorqueLbFt = 420;
  }

  let redlineRpm: number | null = null;
  if (motorbike) redlineRpm = 11000;
  else if (racing) redlineRpm = 9000;
  else if (parsed.electric) redlineRpm = 8000;
  else if (displacementL != null) {
    if (displacementL <= 1.6) redlineRpm = 8200;
    else if (displacementL <= 2.5) redlineRpm = 7600;
    else if (displacementL <= 4.5) redlineRpm = 7200;
    else if (displacementL <= 6.5) redlineRpm = 6800;
    else redlineRpm = 6200;
  }
  if ((cylinders ?? 0) >= 10 && redlineRpm) redlineRpm = Math.max(redlineRpm, 8200);

  const peakTorqueRpm = redlineRpm
    ? Math.round(redlineRpm * (aspiration === "na" ? 0.72 : 0.55))
    : null;

  // Engine mass scales with displacement and cylinder count; motorbike swaps
  // are dramatically lighter than anything they replace.
  let weightLbs: number | null = null;
  if (stock.weightLbs) {
    const stockL = stock.displacementCc ? stock.displacementCc / 1000 : null;
    let delta = 0;
    if (motorbike) delta = -180;
    else if (displacementL != null && stockL != null) delta = (displacementL - stockL) * 55;
    else if (displacementL != null) delta = (displacementL - 3) * 40;
    if (aspiration === "twin") delta += 40;
    else if (aspiration === "turbo" || aspiration === "super") delta += 25;
    weightLbs = Math.max(600, Math.round(stock.weightLbs + delta));
  }

  return { aspiration, weightLbs, maxTorqueLbFt, redlineRpm, peakTorqueRpm };
}

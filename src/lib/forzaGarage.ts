/** Imported from forzagarage.com — see scripts/scrape-forzagarage.cjs */

export interface ForzaGaragePerk {
  perkId: string;
  name: string;
  desc: string;
  cost: number;
  effect: string;
  icon: string | null;
  uses: number;
}

export interface ForzaGarageMastery {
  totalCost: number | null;
  perkCount: number | null;
  cells: (string | null)[];
  perks: Record<string, ForzaGaragePerk>;
}

export interface ForzaGarageTuneSpecs {
  driveType?: string | null;
  weightLbs?: number | null;
  weightDist?: number | null;
  powerHp?: number | null;
  maxTorqueLbFt?: number | null;
  displacementCc?: number | null;
  topspeedMph?: number | null;
  redlineRpm?: number | null;
  peakTorqueRpm?: number | null;
  gears?: number | null;
  aspiration?: string | null;
  engineConfig?: string | null;
  enginePlacement?: string | null;
  cylinders?: number | null;
  stockCompound?: string | null;
  tireFront?: string | null;
  tireRear?: string | null;
  hasAero?: boolean;
  downforceFront?: number | null;
  downforceRear?: number | null;
}

export interface ForzaGarageCar {
  slug: string;
  url: string;
  year: string;
  make: string;
  model: string;
  name: string;
  cost: number | null;
  rarity: string | null;
  class: string | null;
  pi: number | null;
  drive: string | null;
  powerHp?: number | null;
  topSpeedMph?: number | null;
  weightLbs?: number | null;
  torqueLbFt?: number | null;
  heroCode: string | null;
  logoCode?: string | null;
  image: string | null;
  stats: Record<string, number>;
  tuneSpecs?: ForzaGarageTuneSpecs;
  mastery?: ForzaGarageMastery;
  acquisition?: string;
  mediaName?: string;
}

export interface ForzaGarageFile {
  version: number;
  importedAt: string;
  source: string;
  assetBase: string;
  count: number;
  cars: ForzaGarageCar[];
}

let cache: ForzaGarageFile | null = null;
let loadPromise: Promise<ForzaGarageFile> | null = null;

export async function loadForzaGarage(): Promise<ForzaGarageFile> {
  if (cache) return cache;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const res = await fetch("./forzaGarage.json");
    if (!res.ok) throw new Error("Failed to load Forza Garage data");
    cache = (await res.json()) as ForzaGarageFile;
    return cache;
  })();

  return loadPromise;
}

function norm(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function findGarageCar(
  cars: ForzaGarageCar[],
  make: string,
  model: string,
): ForzaGarageCar | null {
  const m = norm(make);
  const mod = norm(model.split(" '")[0]);

  return (
    cars.find((c) => norm(c.make) === m && (norm(c.model).includes(mod) || mod.includes(norm(c.model)))) ??
    cars.find((c) => norm(c.make) === m && norm(c.name).includes(mod)) ??
    null
  );
}

export function findGarageCarByName(cars: ForzaGarageCar[], name: string): ForzaGarageCar | null {
  const n = norm(name);
  return cars.find((c) => norm(c.name) === n) ?? cars.find((c) => norm(c.name).includes(n)) ?? null;
}

export function formatCredits(n: number | null | undefined): string {
  if (n == null) return "—";
  return n.toLocaleString() + " CR";
}

export const GARAGE_COLLECTION_KEY = "ts_garage_owned";

export function loadOwnedSlugs(): Set<string> {
  try {
    const raw = localStorage.getItem(GARAGE_COLLECTION_KEY);
    if (!raw) return new Set();
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

export function saveOwnedSlugs(slugs: Set<string>) {
  try {
    localStorage.setItem(GARAGE_COLLECTION_KEY, JSON.stringify([...slugs]));
  } catch {
    /* ignore */
  }
}

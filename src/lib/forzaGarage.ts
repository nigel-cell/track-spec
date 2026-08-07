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
  description?: string;
}

export interface ForzaGarageFile {
  version: number;
  importedAt: string;
  source: string;
  assetBase: string;
  count: number;
  cars: ForzaGarageCar[];
}

let listCache: ForzaGarageFile | null = null;
let listPromise: Promise<ForzaGarageFile> | null = null;
let fullCache: ForzaGarageFile | null = null;
let fullPromise: Promise<ForzaGarageFile> | null = null;
const detailBySlug = new Map<string, ForzaGarageCar>();

/** Slim index for garage grid (~300 KB). Prefer this for list UI. */
export async function loadForzaGarageList(): Promise<ForzaGarageFile> {
  if (listCache) return listCache;
  if (listPromise) return listPromise;

  listPromise = (async () => {
    try {
      const res = await fetch("./forzaGarage-list.json");
      if (!res.ok) throw new Error("list missing");
      listCache = (await res.json()) as ForzaGarageFile;
      return listCache;
    } catch {
      // Older builds / first deploy: fall back to full file, then strip heavy fields in memory.
      const full = await loadForzaGarage();
      listCache = {
        ...full,
        cars: full.cars.map((car) => {
          const { mastery: _m, tuneSpecs: _t, description: _d, ...slim } = car;
          return slim;
        }),
      };
      return listCache;
    }
  })();

  return listPromise;
}

/** Full garage DB (mastery + tuneSpecs). Lazy — only when detail/tune needs it. */
export async function loadForzaGarage(): Promise<ForzaGarageFile> {
  if (fullCache) return fullCache;
  if (fullPromise) return fullPromise;

  fullPromise = (async () => {
    const res = await fetch("./forzaGarage.json");
    if (!res.ok) throw new Error("Failed to load Forza Garage data");
    fullCache = (await res.json()) as ForzaGarageFile;
    for (const car of fullCache.cars) detailBySlug.set(car.slug, car);
    return fullCache;
  })();

  return fullPromise;
}

/** Merge list car with full detail (mastery / tuneSpecs) when available. */
export async function enrichGarageCar(car: ForzaGarageCar): Promise<ForzaGarageCar> {
  if (car.tuneSpecs || car.mastery) return car;
  const cached = detailBySlug.get(car.slug);
  if (cached) return cached;
  const full = await loadForzaGarage();
  return full.cars.find((c) => c.slug === car.slug) ?? car;
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

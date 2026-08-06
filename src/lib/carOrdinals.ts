/** FH6 telemetry carOrdinal → display name (community mapping). */

export interface CarOrdinalsFile {
  version: number;
  byOrdinal: Record<string, string>;
}

let cache: Map<number, string> | null = null;
let loadPromise: Promise<Map<number, string>> | null = null;

export async function loadCarOrdinals(): Promise<Map<number, string>> {
  if (cache) return cache;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const res = await fetch("./carOrdinals.json");
    if (!res.ok) throw new Error("Failed to load car ordinals");
    const data = (await res.json()) as CarOrdinalsFile;
    const map = new Map<number, string>();
    for (const [ord, name] of Object.entries(data.byOrdinal ?? {})) {
      map.set(Number(ord), name);
    }
    cache = map;
    return map;
  })();

  return loadPromise;
}

export function lookupCarName(map: Map<number, string> | null, ordinal: number): string | null {
  if (!ordinal || !map) return null;
  return map.get(ordinal) ?? null;
}

/** Parse "2012 Nissan GT-R …" using known makes from cars.json. */
export function parseOrdinalDisplayName(
  name: string,
  knownMakes: string[],
): { year?: string; make: string; model: string } {
  const yearMatch = name.match(/^(\d{4})\s+(.+)$/);
  if (!yearMatch) {
    return { make: "", model: name };
  }

  const year = yearMatch[1];
  const rest = yearMatch[2];
  const sorted = [...knownMakes].sort((a, b) => b.length - a.length);

  for (const make of sorted) {
    if (rest.startsWith(`${make} `)) {
      return { year, make, model: rest.slice(make.length + 1) };
    }
  }

  const space = rest.indexOf(" ");
  if (space === -1) return { year, make: rest, model: "" };
  return { year, make: rest.slice(0, space), model: rest.slice(space + 1) };
}

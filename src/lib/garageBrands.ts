let cache: Record<string, string> | null = null;
let loadPromise: Promise<Record<string, string>> | null = null;

export async function loadBrandMap(): Promise<Record<string, string>> {
  if (cache) return cache;
  if (loadPromise) return loadPromise;

  loadPromise = (async () => {
    const res = await fetch("./garage/brands.json");
    if (!res.ok) throw new Error("Failed to load brands");
    const data = (await res.json()) as { byMake?: Record<string, string> };
    cache = data.byMake ?? {};
    return cache;
  })();

  return loadPromise;
}

export function brandLogoUrl(code: string | null | undefined): string | null {
  if (!code) return null;
  return `/garage/logos/${code}.webp`;
}

export function logoCodeForMake(map: Record<string, string>, make: string): string | null {
  return map[make] ?? null;
}

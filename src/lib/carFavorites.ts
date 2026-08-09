/** Favorite cars for quick tuning — persists measured-limit cars and last drafts. */

export const FAVORITES_KEY = "ts_v1_favorite_cars";
export const FAVORITE_DRAFTS_KEY = "ts_v1_favorite_drafts";
export const LAST_FAVORITE_KEY = "ts_v1_last_favorite";

/** Seeded so the two cars we measured are ready on first launch. */
export const DEFAULT_FAVORITE_SLUGS = [
  "toyota-gr86-2022",
  "ferrari-430-scuderia-2007",
] as const;

export function loadFavoriteSlugs(): Set<string> {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (raw == null) {
      const seeded = new Set<string>(DEFAULT_FAVORITE_SLUGS);
      saveFavoriteSlugs(seeded);
      return seeded;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set(DEFAULT_FAVORITE_SLUGS);
    return new Set(parsed.map(String));
  } catch {
    return new Set(DEFAULT_FAVORITE_SLUGS);
  }
}

export function saveFavoriteSlugs(slugs: Set<string>) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify([...slugs]));
  } catch {
    /* quota */
  }
}

export function setLastFavoriteSlug(slug: string | null) {
  try {
    if (!slug) localStorage.removeItem(LAST_FAVORITE_KEY);
    else localStorage.setItem(LAST_FAVORITE_KEY, slug);
  } catch {
    /* ignore */
  }
}

export function getLastFavoriteSlug(): string | null {
  try {
    return localStorage.getItem(LAST_FAVORITE_KEY);
  } catch {
    return null;
  }
}

type DraftMap = Record<string, unknown>;

function readDrafts(): DraftMap {
  try {
    const raw = localStorage.getItem(FAVORITE_DRAFTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeDrafts(map: DraftMap) {
  try {
    localStorage.setItem(FAVORITE_DRAFTS_KEY, JSON.stringify(map));
  } catch {
    /* quota */
  }
}

/** Persist Manual setup so reopening a favorite continues the same tune. */
export function saveFavoriteDraft(slug: string, draft: unknown): void {
  if (!slug) return;
  const all = readDrafts();
  all[slug] = draft;
  writeDrafts(all);
  setLastFavoriteSlug(slug);
}

export function loadFavoriteDraft<T = unknown>(slug: string): T | null {
  if (!slug) return null;
  const d = readDrafts()[slug];
  return d == null ? null : (d as T);
}

export function clearFavoriteDraft(slug: string): void {
  const all = readDrafts();
  delete all[slug];
  writeDrafts(all);
}

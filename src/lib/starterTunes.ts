/** Bundled Track Spec tunes (not the user's local saves). */

import type { SavedTune } from "./tuneSaves";
import { assetUrl } from "./assetUrl";
import type { StarterTuneFile, StarterTuneRecord } from "./makeStarterTune";

let cache: StarterTuneFile | null = null;
let loadPromise: Promise<StarterTuneFile | null> | null = null;

export async function loadStarterTunes(): Promise<StarterTuneFile | null> {
  if (cache) return cache;
  if (loadPromise) return loadPromise;
  loadPromise = (async () => {
    try {
      const url = assetUrl("./starterTunes.json");
      if (!url) return null;
      const res = await fetch(url);
      if (!res.ok) return null;
      cache = (await res.json()) as StarterTuneFile;
      return cache;
    } catch {
      return null;
    }
  })();
  return loadPromise;
}

export function listStarterTunesForSlug(
  file: StarterTuneFile | null,
  slug: string | undefined,
): StarterTuneRecord[] {
  if (!file || !slug) return [];
  return file.tunes.filter((t) => t.slug === slug);
}

export function starterToSavedTune(record: StarterTuneRecord, index: number): SavedTune {
  let id = 0;
  for (let i = 0; i < record.slug.length; i++) id = (id * 31 + record.slug.charCodeAt(i)) | 0;
  return {
    id: -Math.abs(id) - index - 1,
    name: record.name,
    date: "Track Spec",
    trackNote: record.note,
    config: record.config,
    balance: record.balance,
    aggression: record.aggression,
    tunePages: {} as SavedTune["tunePages"],
  };
}

/**
 * Manual draft persist/load + LRU.
 * Usage: node --experimental-strip-types scripts/check-manual-draft.mts
 */
import {
  LAST_MANUAL_DRAFT_KEY,
  MAX_MANUAL_DRAFTS,
  loadLastManualDraft,
  loadManualDraft,
  resolveManualDraft,
  saveManualDraft,
  slugFromMakeModel,
} from "../src/lib/manualDraft.ts";

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

class MemoryStorage {
  private readonly map = new Map<string, string>();
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
}

Object.defineProperty(globalThis, "localStorage", {
  value: new MemoryStorage(),
  configurable: true,
});

if (slugFromMakeModel("Nissan", "GT-R '17") !== "custom:nissan:gt-r-17") {
  fail(`slugFromMakeModel unexpected: ${slugFromMakeModel("Nissan", "GT-R '17")}`);
}
if (slugFromMakeModel("  ", "") !== "") fail("empty make/model should be empty slug");

localStorage.clear();

const saved = saveManualDraft({
  slug: "toyota-gr86-2022",
  section: "specs",
  mode: "full",
  config: { make: "Toyota", model: "GR86", weight: 2811, tuneId: "Touge" },
});
if (!saved) fail("saveManualDraft returned null");
if (saved.section !== "specs") fail("saved section");
if (saved.mode !== "full") fail("saved mode");
if (saved.config.weight !== 2811) fail("saved weight");

const loaded = loadManualDraft("toyota-gr86-2022");
if (!loaded || loaded.section !== "specs" || loaded.config.tuneId !== "Touge") {
  fail(`loadManualDraft mismatch: ${JSON.stringify(loaded)}`);
}
if (loadLastManualDraft()?.slug !== "toyota-gr86-2022") fail("last draft pointer");
if (localStorage.getItem(LAST_MANUAL_DRAFT_KEY) !== "toyota-gr86-2022") fail("last key");

saveManualDraft({
  slug: "custom:nissan:gt-r",
  section: "engine",
  mode: "quick",
  config: { make: "Nissan", model: "GT-R" },
});
const resolved = resolveManualDraft(["missing", "custom:nissan:gt-r", "toyota-gr86-2022"]);
if (resolved?.slug !== "custom:nissan:gt-r") fail("resolveManualDraft should take first hit");

if (saveManualDraft({ slug: "  ", section: "car", mode: "quick", config: {} })) {
  fail("blank slug should not save");
}
if (loadManualDraft("")) fail("blank slug load");

localStorage.clear();

for (let i = 0; i < MAX_MANUAL_DRAFTS + 5; i++) {
  saveManualDraft({
    slug: `car-${i}`,
    section: "car",
    mode: "quick",
    config: { make: "Test", model: `Car ${i}` },
  });
}
const keptNewest = loadManualDraft(`car-${MAX_MANUAL_DRAFTS + 4}`);
if (!keptNewest) fail("newest draft should survive LRU");
const evicted = loadManualDraft("car-0");
if (evicted) fail("oldest draft should be pruned");

localStorage.clear();

saveManualDraft({
  slug: "keep-me",
  section: "tune",
  mode: "full",
  config: { make: "Keep" },
});
for (let i = 0; i < MAX_MANUAL_DRAFTS; i++) {
  saveManualDraft({
    slug: `newer-${i}`,
    section: "car",
    mode: "quick",
    config: { make: "Newer" },
  });
}
saveManualDraft({
  slug: "keep-me",
  section: "engine",
  mode: "full",
  config: { make: "Keep", weight: 9 },
});
const stillKept = loadManualDraft("keep-me");
if (!stillKept || stillKept.section !== "engine" || stillKept.config.weight !== 9) {
  fail("re-saving a draft should refresh it and keep it through prune");
}

console.log("check-manual-draft: ok");

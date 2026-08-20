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
  mergeResumedConfig,
} from "../src/lib/manualDraft.ts";

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

class MemoryStorage {
  private readonly map = new Map<string, string>();
  throwOnSet = false;
  noOpSet = false;
  getItem(key: string): string | null {
    return this.map.has(key) ? this.map.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    if (this.throwOnSet) throw new Error("quota");
    if (this.noOpSet) return;
    this.map.set(key, String(value));
  }
  removeItem(key: string): void {
    this.map.delete(key);
  }
  clear(): void {
    this.map.clear();
  }
}

const storage = new MemoryStorage();
Object.defineProperty(globalThis, "localStorage", {
  value: storage,
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

const resumed = mergeResumedConfig(
  { make: "Ferrari", weight: 3000, tuneId: "Race", pi: 800 },
  { weight: 3150, tuneId: "Touge" },
  { weight: 3120, mode: "full" },
);
if (resumed.make !== "Ferrari") fail("baseline make should remain");
if (resumed.weight !== 3120) fail("manual draft weight should win");
if (resumed.tuneId !== "Touge") fail("favorite tuneId should remain when manual omits it");
if (resumed.mode !== "full") fail("manual mode should apply");
if (resumed.pi !== 800) fail("baseline pi should remain");

storage.throwOnSet = true;
if (
  saveManualDraft({
    slug: "quota-car",
    section: "car",
    mode: "quick",
    config: { make: "Quota" },
  })
) {
  fail("saveManualDraft should return null when localStorage throws");
}
storage.throwOnSet = false;
storage.noOpSet = true;
if (
  saveManualDraft({
    slug: "noop-car",
    section: "car",
    mode: "quick",
    config: { make: "Noop" },
  })
) {
  fail("saveManualDraft should return null when localStorage does not keep the write");
}
storage.noOpSet = false;

console.log("check-manual-draft: ok");

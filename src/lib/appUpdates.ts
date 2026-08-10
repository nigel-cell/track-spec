export interface UpdateEntry {
  version: string;
  date: string;
  title: string;
  items: string[];
}

export interface UpdatesManifest {
  version: string;
  updatedAt: string;
  downloadUrl?: string;
  repoUrl?: string;
  entries: UpdateEntry[];
}

/** Bundled at build time — “this install” version. */
export const APP_VERSION = "1.2.1";

const REMOTE_MANIFEST =
  "https://raw.githubusercontent.com/nigel-cell/track-spec/main/public/updates.json";

let cachedLocal: UpdatesManifest | null = null;

function parseVersion(v: string): number[] {
  return v
    .replace(/^v/i, "")
    .split(/[.+-]/)
    .map((p) => parseInt(p, 10) || 0);
}

/** Returns true if `a` is greater than `b` (semver-ish). */
export function isNewerVersion(a: string, b: string): boolean {
  const aa = parseVersion(a);
  const bb = parseVersion(b);
  const n = Math.max(aa.length, bb.length);
  for (let i = 0; i < n; i++) {
    const x = aa[i] ?? 0;
    const y = bb[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

export async function loadLocalUpdates(): Promise<UpdatesManifest> {
  if (cachedLocal) return cachedLocal;
  const res = await fetch(`./updates.json?v=${APP_VERSION}`);
  if (!res.ok) throw new Error("Could not load changelog");
  cachedLocal = (await res.json()) as UpdatesManifest;
  return cachedLocal;
}

export type UpdateCheckResult = {
  status: "current" | "available" | "unknown";
  localVersion: string;
  remoteVersion?: string;
  remote?: UpdatesManifest;
  message: string;
};

/**
 * Compare this install to the latest updates.json on GitHub main.
 * Web/PWA: “Update” still uses service-worker refresh for the running host.
 * Desktop exe: points users at downloadUrl when a newer version is published.
 */
export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
  const localVersion = APP_VERSION;
  try {
    const local = await loadLocalUpdates().catch(() => null);
    const ver = local?.version ?? localVersion;

    const res = await fetch(`${REMOTE_MANIFEST}?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) {
      return {
        status: "unknown",
        localVersion: ver,
        message: "Could not reach the update server. Try again on Wi‑Fi.",
      };
    }
    const remote = (await res.json()) as UpdatesManifest;
    if (isNewerVersion(remote.version, ver)) {
      return {
        status: "available",
        localVersion: ver,
        remoteVersion: remote.version,
        remote,
        message: `Version ${remote.version} is available (you have ${ver}).`,
      };
    }
    return {
      status: "current",
      localVersion: ver,
      remoteVersion: remote.version,
      remote,
      message: `You're on the latest version (${ver}).`,
    };
  } catch {
    return {
      status: "unknown",
      localVersion,
      message: "Update check failed. Check your connection and try again.",
    };
  }
}

export function isElectronShell(): boolean {
  return typeof navigator !== "undefined" && /Electron/i.test(navigator.userAgent);
}

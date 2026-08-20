/**
 * In-app desktop install helper: download then replace+relaunch.
 * Usage: node --experimental-strip-types scripts/check-desktop-install.mts
 */
import { runDesktopInstallWithBridge } from "../src/lib/desktopInstall.ts";
import type { TrackSpecDesktopApi } from "../src/lib/desktopBridge.ts";

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

const calls: string[] = [];
let progressHandler: ((p: { received: number; total: number; percent: number }) => void) | null =
  null;

function makeBridge(installOk: boolean): TrackSpecDesktopApi {
  return {
    isDesktop: true,
    getInfo: async () => ({
      isDesktop: true,
      isPackaged: true,
      isPortable: true,
      portablePath: "C:\\TrackSpec-Live.exe",
      version: "1.3.4",
      userData: "C:\\user",
    }),
    downloadUpdate: async (url: string) => {
      calls.push(`download:${url}`);
      progressHandler?.({ received: 40, total: 100, percent: 40 });
      progressHandler?.({ received: 100, total: 100, percent: 100 });
      return { ok: true, path: "C:\\Temp\\new.exe", bytes: 2_000_000 };
    },
    installUpdate: async () => {
      calls.push("install");
      if (!installOk) return { ok: false, error: "locked" };
      return { ok: true, mode: "replace-portable", target: "C:\\TrackSpec-Live.exe" };
    },
    cancelUpdate: async () => ({ ok: true }),
    onUpdateProgress: (handler) => {
      progressHandler = handler;
      return () => {
        progressHandler = null;
      };
    },
  };
}

const percents: number[] = [];
const ok = await runDesktopInstallWithBridge(
  makeBridge(true),
  "https://example.test/TrackSpec-Live.exe",
  (n) => percents.push(n),
);
if (!ok.ok) fail(`expected ok, got ${JSON.stringify(ok)}`);
if (calls.join(",") !== "download:https://example.test/TrackSpec-Live.exe,install") {
  fail(`call order ${calls.join(",")}`);
}
if (!percents.includes(40) || !percents.includes(100)) fail(`progress ${percents.join(",")}`);

calls.length = 0;
const bad = await runDesktopInstallWithBridge(
  makeBridge(false),
  "https://example.test/TrackSpec-Live.exe",
);
if (bad.ok || !("error" in bad) || bad.error !== "locked") {
  fail(`expected locked, got ${JSON.stringify(bad)}`);
}
if (!calls.includes("install")) fail("failed install still called installUpdate");

console.log("check-desktop-install: ok");

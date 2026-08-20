import { getDesktopBridge, type TrackSpecDesktopApi } from "./desktopBridge.ts";

export type DesktopInstallPhase = "idle" | "downloading" | "installing" | "error";

export async function runDesktopInstallWithBridge(
  bridge: TrackSpecDesktopApi,
  url: string,
  onProgress?: (percent: number) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!url) {
    return { ok: false, error: "Missing download link." };
  }

  const stop = bridge.onUpdateProgress((p) => {
    onProgress?.(p.percent || 0);
  });

  try {
    const downloaded = await bridge.downloadUpdate(url);
    if (!downloaded.ok) {
      return { ok: false, error: downloaded.error || "Download failed." };
    }
    onProgress?.(100);
    const installed = await bridge.installUpdate();
    if (!installed.ok) {
      return { ok: false, error: installed.error || "Could not install the update." };
    }
    if (installed.mode === "manual") {
      return {
        ok: false,
        error: "Downloaded. Open the new exe from the folder that just opened.",
      };
    }
    return { ok: true };
  } finally {
    stop();
  }
}

/**
 * Download the new portable exe, replace this one, and let the helper restart Track Spec.
 */
export async function runDesktopInstall(
  url: string,
  onProgress?: (percent: number) => void,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const bridge = getDesktopBridge();
  if (!bridge) {
    return { ok: false, error: "This copy cannot update itself. Download TrackSpec-Live.exe from GitHub." };
  }
  return runDesktopInstallWithBridge(bridge, url, onProgress);
}

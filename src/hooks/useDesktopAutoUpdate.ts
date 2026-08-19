import { useEffect, useState } from "react";
import {
  checkForAppUpdate,
  isElectronShell,
  type UpdateCheckResult,
} from "../lib/appUpdates";
import { hasDesktopUpdater } from "../lib/desktopBridge";

const PROMPTED_KEY = "ts_desktop_update_prompted";

/**
 * Desktop exe: check GitHub updates.json on launch.
 * If a newer exe is published, highlight Update and open the sheet once.
 */
export function useDesktopAutoUpdate() {
  const [check, setCheck] = useState<UpdateCheckResult | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);

  const enabled = isElectronShell() && hasDesktopUpdater();

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void checkForAppUpdate().then((result) => {
      if (cancelled) return;
      setCheck(result);
      if (result.status !== "available" || !result.remoteVersion) return;
      try {
        if (sessionStorage.getItem(PROMPTED_KEY) === result.remoteVersion) return;
        sessionStorage.setItem(PROMPTED_KEY, result.remoteVersion);
      } catch {
        /* private mode */
      }
      setPromptOpen(true);
    });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    enabled,
    available: check?.status === "available",
    check,
    promptOpen,
    dismissPrompt: () => setPromptOpen(false),
  };
}

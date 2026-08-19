import { useEffect, useRef, useState } from "react";
import {
  APP_VERSION,
  checkForAppUpdate,
  isElectronShell,
  loadLocalUpdates,
  type UpdateCheckResult,
  type UpdatesManifest,
} from "../../lib/appUpdates";
import { getDesktopBridge, hasDesktopUpdater } from "../../lib/desktopBridge";
import { Button } from "../ui/Button";

interface UpdatesSheetProps {
  open: boolean;
  onClose: () => void;
  updateReady?: boolean;
  refreshBusy?: boolean;
  autoStartDownload?: boolean;
  onUpdateNow?: () => void;
}

type InstallPhase = "idle" | "downloading" | "ready" | "installing" | "error";

export function UpdatesSheet({
  open,
  onClose,
  updateReady,
  refreshBusy,
  autoStartDownload,
  onUpdateNow,
}: UpdatesSheetProps) {
  const [manifest, setManifest] = useState<UpdatesManifest | null>(null);
  const [check, setCheck] = useState<UpdateCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [phase, setPhase] = useState<InstallPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const autoStarted = useRef(false);

  const electron = isElectronShell();
  const desktopUpdater = hasDesktopUpdater();

  const runCheck = async () => {
    setChecking(true);
    try {
      const result = await checkForAppUpdate();
      setCheck(result);
      if (result.remote) setManifest(result.remote);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadError(null);
    void loadLocalUpdates()
      .then((m) => {
        if (!cancelled) setManifest(m);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Could not load changelog.");
      });
    void runCheck().catch(() => {
      /* offline */
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !desktopUpdater) return;
    const bridge = getDesktopBridge();
    if (!bridge) return;
    return bridge.onUpdateProgress((p) => {
      setProgress(p.percent || 0);
    });
  }, [open, desktopUpdater]);

  useEffect(() => {
    if (!open) {
      autoStarted.current = false;
      return;
    }
    if (!autoStartDownload || !electron || !desktopUpdater) return;
    if (checking || phase !== "idle") return;
    if (check?.status !== "available") return;
    const url = check.remote?.downloadUrl || manifest?.downloadUrl;
    if (!url || autoStarted.current) return;
    autoStarted.current = true;
    const bridge = getDesktopBridge();
    if (!bridge) {
      autoStarted.current = false;
      return;
    }
    setPhase("downloading");
    setProgress(0);
    setUpdateError(null);
    void bridge.downloadUpdate(url).then((result) => {
      if (!result.ok) {
        setPhase("error");
        setUpdateError(result.error || "Download failed");
        return;
      }
      setPhase("ready");
      setProgress(100);
    });
  }, [
    open,
    autoStartDownload,
    electron,
    desktopUpdater,
    checking,
    phase,
    check,
    manifest,
  ]);

  if (!open) return null;

  const remoteNewer = check?.status === "available";
  const downloadUrl = check?.remote?.downloadUrl || manifest?.downloadUrl;
  const canWebUpdate = !electron && !!onUpdateNow;

  const handlePrimaryUpdate = async () => {
    if (electron && desktopUpdater) {
      const bridge = getDesktopBridge();
      if (!bridge || !downloadUrl) {
        void runCheck();
        return;
      }

      if (phase === "ready") {
        setPhase("installing");
        setUpdateError(null);
        const result = await bridge.installUpdate();
        if (!result.ok) {
          setPhase("error");
          setUpdateError(result.error || "Could not install update");
          return;
        }
        if (result.mode === "manual") {
          setPhase("idle");
          setUpdateError("Downloaded — open the new exe from the folder that just opened.");
        }
        // replace-portable quits the app
        return;
      }

      setPhase("downloading");
      setProgress(0);
      setUpdateError(null);
      const result = await bridge.downloadUpdate(downloadUrl);
      if (!result.ok) {
        setPhase("error");
        setUpdateError(result.error || "Download failed");
        return;
      }
      setPhase("ready");
      setProgress(100);
      return;
    }

    if (electron) {
      // Older exe without preload bridge — fall back to browser download.
      if (downloadUrl) window.open(downloadUrl, "_blank", "noopener,noreferrer");
      else void runCheck();
      return;
    }

    if (onUpdateNow) {
      onUpdateNow();
      onClose();
    }
  };

  const handleCancelDownload = () => {
    const bridge = getDesktopBridge();
    void bridge?.cancelUpdate();
    setPhase("idle");
    setProgress(0);
  };

  const primaryLabel = (() => {
    if (!electron) {
      return refreshBusy ? "Updating…" : "Update now";
    }
    if (phase === "downloading") return `Downloading… ${progress}%`;
    if (phase === "ready") return "Restart & install";
    if (phase === "installing") return "Installing…";
    if (remoteNewer) return desktopUpdater ? "Download & install" : "Download latest exe";
    if (checking) return "Checking…";
    return desktopUpdater ? "Check / install update" : "Update / download latest";
  })();

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="safe-bottom mx-auto flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-surface)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-4 pt-4">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--ts-border)]" />
          <h2 className="font-[family-name:var(--ts-font-heading)] text-lg font-semibold tracking-tight">
            Update
          </h2>
          <p className="mt-1 text-sm text-[var(--ts-muted)]">
            Installed version{" "}
            <span className="font-[family-name:var(--ts-font-mono)] text-[var(--ts-text)]">
              {APP_VERSION}
            </span>
            {electron ? " · Desktop" : " · Web / PWA"}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-3">
            <h3 className="text-sm font-semibold">Check for updates</h3>
            <p className="mt-1 text-xs leading-snug text-[var(--ts-muted)]">
              {electron
                ? desktopUpdater
                  ? "On launch this exe checks GitHub for a newer TrackSpec-Live.exe, downloads it here, then restarts to replace itself."
                  : "Compares this exe to the latest release, then opens the download."
                : "Compares this install to the latest Track Spec, then refreshes the app."}
            </p>
            {check && (
              <p
                className={[
                  "mt-2 text-xs font-medium",
                  remoteNewer || updateReady ? "text-[var(--ts-accent)]" : "text-[var(--ts-muted)]",
                ].join(" ")}
              >
                {check.message}
              </p>
            )}
            {updateReady && !electron && (
              <p className="mt-2 text-xs font-medium text-[var(--ts-accent)]">
                A new web build is ready on this device — tap Update now.
              </p>
            )}
            {phase === "downloading" && (
              <div className="mt-3">
                <div className="h-2 overflow-hidden rounded-full bg-[var(--ts-border)]">
                  <div
                    className="h-full bg-[var(--ts-accent)] transition-[width] duration-200"
                    style={{ width: `${Math.max(progress, 2)}%` }}
                  />
                </div>
                <p className="mt-1 text-[10px] text-[var(--ts-muted)]">{progress}% downloaded</p>
              </div>
            )}
            {phase === "ready" && (
              <p className="mt-2 text-xs font-medium text-[var(--ts-accent)]">
                Download complete — restart to install.
              </p>
            )}
            {updateError && <p className="mt-2 text-xs text-[var(--ts-danger)]">{updateError}</p>}
            <div className="mt-3 flex flex-col gap-2">
              {(canWebUpdate || electron) && (
                <Button
                  variant={remoteNewer || updateReady || phase === "ready" ? "primary" : "cta"}
                  full
                  disabled={
                    refreshBusy ||
                    phase === "downloading" ||
                    phase === "installing" ||
                    (electron && checking && !downloadUrl && phase === "idle")
                  }
                  onClick={() => void handlePrimaryUpdate()}
                >
                  {primaryLabel}
                </Button>
              )}
              {phase === "downloading" && desktopUpdater && (
                <Button variant="outline" full onClick={handleCancelDownload}>
                  Cancel download
                </Button>
              )}
              <Button
                variant="outline"
                full
                disabled={checking || phase === "downloading" || phase === "installing"}
                onClick={() => void runCheck()}
              >
                {checking ? "Checking…" : "Check again"}
              </Button>
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-[family-name:var(--ts-font-heading)] text-sm font-semibold uppercase tracking-[0.12em]">
              What’s new
            </h3>
            {loadError && <p className="text-sm text-[var(--ts-danger)]">{loadError}</p>}
            {!manifest && !loadError && (
              <p className="text-sm text-[var(--ts-muted)]">Loading changelog…</p>
            )}
            <ul className="space-y-3">
              {manifest?.entries.map((entry) => (
                <li
                  key={entry.version}
                  className="rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-3"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-[family-name:var(--ts-font-mono)] text-sm font-bold text-[var(--ts-accent)]">
                      v{entry.version}
                    </span>
                    <span className="text-[10px] text-[var(--ts-muted)]">{entry.date}</span>
                  </div>
                  <p className="mt-1 text-sm font-semibold">{entry.title}</p>
                  <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[var(--ts-muted)]">
                    {entry.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="shrink-0 border-t border-[var(--ts-border)] p-4">
          <Button variant="ghost" full onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}

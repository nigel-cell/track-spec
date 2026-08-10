import { useEffect, useState } from "react";
import {
  APP_VERSION,
  checkForAppUpdate,
  isElectronShell,
  loadLocalUpdates,
  type UpdateCheckResult,
  type UpdatesManifest,
} from "../../lib/appUpdates";
import { Button } from "../ui/Button";

interface UpdatesSheetProps {
  open: boolean;
  onClose: () => void;
  updateReady?: boolean;
  refreshBusy?: boolean;
  onUpdateNow?: () => void;
}

export function UpdatesSheet({
  open,
  onClose,
  updateReady,
  refreshBusy,
  onUpdateNow,
}: UpdatesSheetProps) {
  const [manifest, setManifest] = useState<UpdatesManifest | null>(null);
  const [check, setCheck] = useState<UpdateCheckResult | null>(null);
  const [checking, setChecking] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  if (!open) return null;

  const electron = isElectronShell();
  const remoteNewer = check?.status === "available";
  const downloadUrl = check?.remote?.downloadUrl || manifest?.downloadUrl;
  const canWebUpdate = !electron && !!onUpdateNow;
  const canExeDownload = electron && !!downloadUrl;

  const handlePrimaryUpdate = () => {
    if (electron) {
      if (downloadUrl) {
        window.open(downloadUrl, "_blank", "noopener,noreferrer");
      } else {
        void runCheck();
      }
      return;
    }
    if (onUpdateNow) {
      onUpdateNow();
      onClose();
    }
  };

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
                ? "Compares this exe to the latest GitHub release, then opens the download."
                : "Compares this install to the latest Track Spec on GitHub, then refreshes the app."}
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
            <div className="mt-3 flex flex-col gap-2">
              {(canWebUpdate || canExeDownload || electron) && (
                <Button
                  variant={remoteNewer || updateReady ? "primary" : "cta"}
                  full
                  disabled={refreshBusy || (electron && checking && !downloadUrl)}
                  onClick={handlePrimaryUpdate}
                >
                  {electron
                    ? remoteNewer
                      ? "Download latest exe"
                      : checking
                        ? "Checking…"
                        : "Update / download latest"
                    : refreshBusy
                      ? "Updating…"
                      : "Update now"}
                </Button>
              )}
              <Button variant="outline" full disabled={checking} onClick={() => void runCheck()}>
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

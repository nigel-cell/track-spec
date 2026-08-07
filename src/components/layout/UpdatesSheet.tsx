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
    return () => {
      cancelled = true;
    };
  }, [open]);

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

  if (!open) return null;

  const electron = isElectronShell();
  const remoteNewer = check?.status === "available";
  const downloadUrl = check?.remote?.downloadUrl || manifest?.downloadUrl;

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end bg-black/60" onClick={onClose}>
      <div
        className="safe-bottom mx-auto flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-surface)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-4 pt-4">
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--ts-border)]" />
          <h2 className="font-[family-name:var(--ts-font-heading)] text-lg font-semibold tracking-tight">
            Updates
          </h2>
          <p className="mt-1 text-sm text-[var(--ts-muted)]">
            Installed version <span className="font-[family-name:var(--ts-font-mono)] text-[var(--ts-text)]">{APP_VERSION}</span>
            {electron ? " · Desktop" : " · Web / PWA"}
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-3">
            <h3 className="text-sm font-semibold">Check for updates</h3>
            <p className="mt-1 text-xs leading-snug text-[var(--ts-muted)]">
              Compares this app to the latest Track Spec on GitHub.
            </p>
            {check && (
              <p
                className={[
                  "mt-2 text-xs font-medium",
                  remoteNewer ? "text-[var(--ts-accent)]" : "text-[var(--ts-muted)]",
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
              <Button variant="outline" full disabled={checking} onClick={() => void runCheck()}>
                {checking ? "Checking…" : "Check for updates"}
              </Button>
              {!electron && onUpdateNow && (
                <Button
                  variant={updateReady || remoteNewer ? "primary" : "outline"}
                  full
                  disabled={refreshBusy}
                  onClick={() => {
                    onUpdateNow();
                    onClose();
                  }}
                >
                  {refreshBusy ? "Updating…" : "Update now"}
                </Button>
              )}
              {electron && remoteNewer && downloadUrl && (
                <Button
                  variant="primary"
                  full
                  onClick={() => {
                    window.open(downloadUrl, "_blank", "noopener,noreferrer");
                  }}
                >
                  Download latest exe
                </Button>
              )}
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

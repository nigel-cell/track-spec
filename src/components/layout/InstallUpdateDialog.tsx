import { useState } from "react";
import { APP_VERSION } from "../../lib/appUpdates";
import { runDesktopInstall } from "../../lib/desktopInstall";
import { Button } from "../ui/Button";

interface InstallUpdateDialogProps {
  open: boolean;
  version?: string;
  title?: string;
  items?: string[];
  downloadUrl?: string;
  onLater: () => void;
}

export function InstallUpdateDialog({
  open,
  version,
  title,
  items,
  downloadUrl,
  onLater,
}: InstallUpdateDialogProps) {
  const [phase, setPhase] = useState<"idle" | "downloading" | "installing" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const busy = phase === "downloading" || phase === "installing";
  const label = version ? `Install Track Spec ${version}` : "Install this update";

  const installNow = async () => {
    if (!downloadUrl) {
      setPhase("error");
      setError("No download link. Use Update in the menu.");
      return;
    }
    setPhase("downloading");
    setProgress(0);
    setError(null);
    const result = await runDesktopInstall(downloadUrl, (percent) => {
      setProgress(percent);
      if (percent >= 100) setPhase("installing");
    });
    if (!result.ok) {
      setPhase("error");
      setError(result.error);
      return;
    }
    setPhase("installing");
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 px-4"
      onClick={busy ? undefined : onLater}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ts-install-title"
        className="w-full max-w-md rounded-[var(--ts-radius-lg)] border border-[var(--ts-border)] bg-[var(--ts-surface)] p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="ts-install-title"
          className="font-[family-name:var(--ts-font-heading)] text-lg font-bold tracking-tight"
        >
          {label}
        </h2>
        <p className="mt-2 text-sm text-[var(--ts-muted)]">
          You have {APP_VERSION}. Install now closes this window, replaces TrackSpec-Live.exe, and
          opens the new one.
        </p>
        {title && <p className="mt-3 text-sm font-semibold text-[var(--ts-text)]">{title}</p>}
        {!!items?.length && (
          <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-[var(--ts-muted)]">
            {items.slice(0, 4).map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        )}

        {phase === "downloading" && (
          <div className="mt-4">
            <div className="h-2 overflow-hidden rounded-full bg-[var(--ts-border)]">
              <div
                className="h-full bg-[var(--ts-accent)] transition-[width] duration-200"
                style={{ width: `${Math.max(progress, 2)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-[var(--ts-muted)]">Downloading {progress}%</p>
          </div>
        )}
        {phase === "installing" && (
          <p className="mt-4 text-sm font-medium text-[var(--ts-accent)]">
            Installing — Track Spec will restart.
          </p>
        )}
        {error && <p className="mt-4 text-sm text-[var(--ts-danger)]">{error}</p>}

        <div className="mt-5 flex flex-col gap-2">
          <Button
            variant="cta"
            full
            disabled={busy}
            onClick={() => void installNow()}
          >
            {phase === "downloading"
              ? `Downloading… ${progress}%`
              : phase === "installing"
                ? "Restarting…"
                : "Install now"}
          </Button>
          <Button variant="ghost" full disabled={busy} onClick={onLater}>
            Not now
          </Button>
        </div>
      </div>
    </div>
  );
}

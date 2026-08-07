import type { ReactNode } from "react";

const TABS = [
  { id: "tune", label: "Tune", icon: "⚙" },
  { id: "telemetry", label: "Live", icon: "📡" },
  { id: "garage", label: "Garage", icon: "🚗" },
  { id: "sessions", label: "Sessions", icon: "🏁" },
  { id: "setup", label: "Setup", icon: "📖" },
] as const;

export type TabId = (typeof TABS)[number]["id"];

interface AppShellProps {
  tab: TabId;
  onTabChange: (tab: TabId) => void;
  onMenuOpen: () => void;
  onRefresh?: () => void;
  refreshBusy?: boolean;
  updateReady?: boolean;
  children: ReactNode;
  /** When true, main pane does not scroll (e.g. Live HUD on desktop). */
  lockMainScroll?: boolean;
}

export function AppShell({
  tab,
  onTabChange,
  onMenuOpen,
  onRefresh,
  refreshBusy,
  updateReady,
  children,
  lockMainScroll,
}: AppShellProps) {
  const immersive = lockMainScroll;

  return (
    <div className="flex h-dvh overflow-hidden bg-[var(--ts-bg)]">
      <aside
        className={[
          "hidden shrink-0 flex-col border-r border-[var(--ts-border)] bg-[var(--ts-surface)] lg:flex",
          immersive ? "w-[68px] items-center px-2 py-3" : "w-[220px] p-4",
        ].join(" ")}
      >
        {!immersive && <img src="/logo-banner.png" alt="Track Spec" className="mb-6 w-full max-w-[180px]" />}
        {immersive && (
          <img src="/icon-192.png" alt="Track Spec" className="mb-4 h-9 w-9 rounded-lg" />
        )}
        <nav className={immersive ? "flex flex-col gap-1" : "flex flex-col gap-2"}>
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => onTabChange(t.id)}
              title={t.label}
              aria-label={t.label}
              className={[
                "flex items-center rounded-[var(--ts-radius-sm)] border transition-colors",
                immersive ? "min-h-11 min-w-11 justify-center px-0 py-0" : "min-h-11 gap-3 px-3 py-2 text-left",
                tab === t.id
                  ? "border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)] text-[var(--ts-accent)]"
                  : "border-transparent text-[var(--ts-muted)] hover:text-[var(--ts-text)]",
              ].join(" ")}
            >
              <span className="text-lg leading-none">{t.icon}</span>
              {!immersive && (
                <span className="font-[family-name:var(--ts-font-heading)] text-sm font-semibold uppercase tracking-[0.12em]">
                  {t.label}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className={`mt-auto flex ${immersive ? "flex-col gap-1" : "flex-col gap-2"}`}>
        <button
          type="button"
          onClick={onMenuOpen}
          title="Design & settings"
          aria-label="Design and settings"
          className={[
            "rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] text-[var(--ts-muted)]",
            immersive ? "flex min-h-11 min-w-11 items-center justify-center text-lg" : "min-h-11 px-3 text-sm",
          ].join(" ")}
        >
          {immersive ? "☰" : "☰ Design & settings"}
        </button>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshBusy}
            title={updateReady ? "Update available" : "Refresh app"}
            aria-label="Refresh app"
            className={[
              "rounded-[var(--ts-radius-sm)] border text-[var(--ts-muted)]",
              immersive ? "flex min-h-11 min-w-11 items-center justify-center text-lg" : "min-h-11 px-3 text-sm",
              updateReady ? "border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)] text-[var(--ts-accent)]" : "border-[var(--ts-border)]",
            ].join(" ")}
          >
            {immersive ? "↻" : "↻ Refresh"}
          </button>
        )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="safe-top relative z-40 flex shrink-0 items-center justify-between gap-2 border-b border-[var(--ts-border)] bg-[var(--ts-bg)] px-4 py-3 lg:hidden">
          <img src="/logo-banner.png" alt="Track Spec" className="h-8 shrink-0" />
          <div className="flex items-center gap-2">
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshBusy}
                title={updateReady ? "Update available — refresh app" : "Refresh app"}
                aria-label="Refresh app"
                className={[
                  "flex min-h-11 min-w-11 items-center justify-center rounded-[var(--ts-radius-sm)] border text-lg",
                  updateReady
                    ? "border-[var(--ts-accent-border)] bg-[var(--ts-accent-soft)] text-[var(--ts-accent)]"
                    : "border-[var(--ts-border)] text-[var(--ts-muted)]",
                ].join(" ")}
              >
                ↻
              </button>
            )}
            <button
              type="button"
              onClick={onMenuOpen}
              className="min-h-11 min-w-11 rounded-[var(--ts-radius-sm)] border border-[var(--ts-border)] text-lg"
              aria-label="Menu"
            >
              ☰
            </button>
          </div>
        </header>

        <main
          data-app-scroll
          className={[
            "min-h-0 flex-1",
            lockMainScroll ? "overflow-auto lg:overflow-hidden" : "overflow-auto",
          ].join(" ")}
        >
          {children}
        </main>

        <nav className="safe-bottom relative z-40 flex shrink-0 border-t border-[var(--ts-border)] bg-[var(--ts-surface)] lg:hidden">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onTabChange(t.id)}
                className="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-1"
                style={{ color: active ? "var(--ts-accent)" : "var(--ts-muted)" }}
              >
                <span className="text-xl leading-none">{t.icon}</span>
                <span className="font-[family-name:var(--ts-font-heading)] text-[11px] font-semibold uppercase tracking-[0.12em]">
                  {t.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

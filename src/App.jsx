import React, { Suspense, lazy, Component } from "react";
import TelemetryTab from "./components/TelemetryTab.jsx";
import "./responsive.css";

const TuneTab = lazy(() => import("./TuneTab.jsx"));

const BRAND = {
  bg: "#000000",
  surface: "#111111",
  border: "#333333",
  text: "#ffffff",
  muted: "#666666",
  accent: "#FF3333",
};

const TABS = [
  { id: "tune", label: "Tune", icon: "⚙" },
  { id: "telemetry", label: "Live", icon: "📡" },
  { id: "setup", label: "Setup", icon: "📖" },
];

class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: BRAND.text, fontFamily: "system-ui,sans-serif", maxWidth: 480, margin: "0 auto" }}>
          <img src="/logo-banner.png" alt="Track Spec" style={{ width: "100%", maxWidth: 220, marginBottom: 16 }} />
          <h2 style={{ color: BRAND.accent, marginBottom: 12 }}>Failed to load</h2>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: "12px 24px", background: `${BRAND.accent}22`, border: `1px solid ${BRAND.accent}`, borderRadius: 8, color: BRAND.accent, fontWeight: 700, cursor: "pointer" }}>
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function Loading() {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", flexDirection: "column", gap: 16, color: BRAND.muted, background: BRAND.bg }}>
      <img src="/icon-192.png" alt="" style={{ width: 64, height: 64, borderRadius: 12 }} />
      <div style={{ width: 32, height: 32, border: `3px solid ${BRAND.border}`, borderTopColor: BRAND.accent, borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <span style={{ fontFamily: "system-ui,sans-serif", fontSize: 13 }}>Loading Track Spec…</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function NavButton({ tab, active, onSelect, className }) {
  return (
    <button className={className} onClick={() => onSelect(tab.id)} type="button">
      <span className="icon">{tab.icon}</span>
      <span>{tab.label}</span>
    </button>
  );
}

export default function App() {
  const [tab, setTab] = React.useState(() => {
    try { return localStorage.getItem("ts_tab") || localStorage.getItem("fth_tab") || "tune"; } catch { return "tune"; }
  });

  const selectTab = (id) => {
    setTab(id);
    try { localStorage.setItem("ts_tab", id); } catch {}
  };

  return (
    <div className="app-shell">
      <nav className="app-nav-desktop">
        <img src="/logo-banner.png" alt="Track Spec" className="app-nav-desktop-logo" />
        {TABS.map((t) => (
          <NavButton
            key={t.id}
            tab={t}
            active={tab === t.id}
            onSelect={selectTab}
            className={`app-nav-desktop-btn${tab === t.id ? " active" : ""}`}
          />
        ))}
      </nav>

      <main className="app-main">
        <ErrorBoundary>
          <Suspense fallback={<Loading />}>
            {tab === "tune" && <TuneTab />}
          </Suspense>
          {(tab === "telemetry" || tab === "setup") && (
            <TelemetryTab initialView={tab === "setup" ? "setup" : "dashboard"} onNavigate={selectTab} />
          )}
        </ErrorBoundary>
      </main>

      <nav className="app-nav-mobile">
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => selectTab(t.id)}
              style={{
                flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
                padding: "10px 4px 8px", background: "transparent", border: "none", cursor: "pointer",
                color: active ? BRAND.accent : BRAND.muted,
              }}
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>{t.icon}</span>
              <span style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                {t.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

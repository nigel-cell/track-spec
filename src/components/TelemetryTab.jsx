import React, { useState, useEffect, useRef, useCallback } from "react";

const C = {
  bg: "#000000",
  surface: "#111111",
  card: "#1a1a1a",
  border: "#333333",
  text: "#ffffff",
  muted: "#666666",
  dim: "#545454",
  accent: "#FF3333",
  grey: "#666666",
  amber: "#ffb020",
  red: "#ff4d4d",
  tireCold: "#666666",
  tireOptimal: "#44cc66",
  tireHot: "#FF3333",
};

function tireColor(temp) {
  if (temp < 60) return C.tireCold;
  if (temp < 85) return C.tireOptimal;
  if (temp < 100) return C.amber;
  return C.tireHot;
}

function getGearLabel(gear) {
  if (gear === 0) return "R";
  if (gear === 11) return "N";
  return String(gear);
}

function getClassLabel(classVal) {
  return ["D", "C", "B", "A", "S1", "S2", "R"][classVal] || "?";
}

function useTelemetryWs(serverIp) {
  const [telemetry, setTelemetry] = useState(null);
  const [wsStatus, setWsStatus] = useState("disconnected");
  const [simulationActive, setSimulationActive] = useState(false);
  const [tutorialIps, setTutorialIps] = useState(["127.0.0.1"]);
  const [lastPacketTime, setLastPacketTime] = useState(0);
  const wsRef = useRef(null);
  const isGameLive = lastPacketTime > 0 && Date.now() - lastPacketTime < 2500;

  useEffect(() => {
    let ws;
    let reconnectTimeout;
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1" ||
      window.location.hostname.startsWith("192.168.") ||
      window.location.hostname.startsWith("10.");
    const defaultHost = isLocal ? window.location.hostname : "localhost";
    const wsHost = serverIp.trim() || defaultHost;
    const wsUrl = `ws://${wsHost}:3000`;

    function connect() {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => setWsStatus("connected");
      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === "telemetry") {
            setTelemetry(payload.data);
            setLastPacketTime(Date.now());
          } else if (payload.type === "init") {
            setTutorialIps(payload.data.ips || ["127.0.0.1"]);
          } else if (payload.type === "simulation_status") {
            setSimulationActive(payload.active);
          }
        } catch {}
      };
      ws.onclose = () => {
        setWsStatus("disconnected");
        setSimulationActive(false);
        reconnectTimeout = setTimeout(connect, 3000);
      };
      ws.onerror = () => ws.close();
    }

    connect();
    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [serverIp]);

  const toggleSimulation = useCallback(() => {
    const ws = wsRef.current;
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "toggle_simulation", active: !simulationActive }));
    }
  }, [simulationActive]);

  return { telemetry, wsStatus, simulationActive, tutorialIps, isGameLive, toggleSimulation };
}

function GForceCanvas({ telemetry, size = 200 }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const s = canvas.width;
    const center = s / 2;
    const maxG = 2.0;

    ctx.clearRect(0, 0, s, s);
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(center, 15);
    ctx.lineTo(center, s - 15);
    ctx.moveTo(15, center);
    ctx.lineTo(s - 15, center);
    ctx.stroke();

    [0.5, 1.0, 1.5].forEach((g) => {
      ctx.strokeStyle = g === 1.0 ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.04)";
      ctx.beginPath();
      ctx.arc(center, center, (g / maxG) * (center - 20), 0, 2 * Math.PI);
      ctx.stroke();
    });

    const xG = telemetry?.accelX ?? 0;
    const zG = telemetry?.accelZ ?? 0;
    let posX = center + (xG / maxG) * (center - 20);
    let posY = center - (zG / maxG) * (center - 20);
    const dist = Math.sqrt((posX - center) ** 2 + (posY - center) ** 2);
    if (dist > center - 15) {
      const angle = Math.atan2(posY - center, posX - center);
      posX = center + Math.cos(angle) * (center - 15);
      posY = center + Math.sin(angle) * (center - 15);
    }

    ctx.fillStyle = C.accent;
    ctx.shadowColor = C.accent;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(posX, posY, 8, 0, 2 * Math.PI);
    ctx.fill();
    ctx.shadowBlur = 0;
  }, [telemetry, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{ display: "block", margin: "0 auto", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }}
    />
  );
}

function TireGrid({ telemetry }) {
  const tires = [
    { key: "FL", temp: telemetry?.tireTempFL ?? 20 },
    { key: "FR", temp: telemetry?.tireTempFR ?? 20 },
    { key: "RL", temp: telemetry?.tireTempRL ?? 20 },
    { key: "RR", temp: telemetry?.tireTempRR ?? 20 },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {tires.map((t) => (
        <div key={t.key} style={{ background: C.card, border: `1px solid ${tireColor(t.temp)}44`, borderRadius: 8, padding: "12px 10px", textAlign: "center" }}>
          <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.15em", marginBottom: 4 }}>{t.key}</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: tireColor(t.temp), fontFamily: "'Share Tech Mono',monospace" }}>{Math.round(t.temp)}°</div>
        </div>
      ))}
    </div>
  );
}

function PedalBar({ label, value, color }) {
  const pct = Math.round((value ?? 0) * 100);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, marginBottom: 4 }}>
        <span>{label}</span><span>{pct}%</span>
      </div>
      <div style={{ height: 8, background: C.border, borderRadius: 4, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 4, transition: "width 0.1s" }} />
      </div>
    </div>
  );
}

function GaugeCard({ label, value, unit }) {
  return (
    <div className="telemetry-card" style={{ textAlign: "center", padding: "14px 8px" }}>
      <div style={{ fontSize: 9, color: C.dim, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 6 }}>{label}</div>
      <div className="gauge-value" style={{ fontSize: 26, fontWeight: 700, color: C.accent, fontFamily: "'Share Tech Mono',monospace", lineHeight: 1 }}>{value}</div>
      {unit && <div style={{ fontSize: 10, color: C.muted, marginTop: 4 }}>{unit}</div>}
    </div>
  );
}

function SetupGuide({ tutorialIps }) {
  const pcIp = tutorialIps[0] || "192.168.x.x";
  const steps = [
    { title: "1. Start the relay on your PC", body: "Double-click START.bat or run npm run server in the project folder.", code: "START.bat" },
    { title: "2. Enable Data Out in Forza", body: "Options → HUD and Gameplay → bottom of page.", list: ["Data Out: ON", "Data Out IP: 127.0.0.1 (PC) or your PC IP (Xbox)", "Data Out Port: 9999"] },
    { title: "3. Open on iPhone or desktop", body: "Same Wi-Fi as your PC. Use Safari on iPhone or any browser on desktop.", list: [`iPhone URL: http://${pcIp}:3000`, "Desktop: http://localhost:3000", "Tap Test mock on Live tab to preview without the game"] },
  ];

  return (
    <div className="telemetry-page setup-page">
      <div className="telemetry-header">
        <img src="/logo-banner.png" alt="Track Spec" />
      </div>
      <h2 style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 28, fontWeight: 700, color: C.text, margin: "0 0 16px" }}>Connection Setup</h2>
      {steps.map((s) => (
        <div key={s.title} className="telemetry-card" style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontSize: 15, fontWeight: 600, color: C.text, marginBottom: 8 }}>{s.title}</div>
          {s.body && <p style={{ fontSize: 13, color: C.muted, lineHeight: 1.6, margin: "0 0 8px" }}>{s.body}</p>}
          {s.code && <code style={{ display: "block", background: C.bg, border: `1px solid ${C.border}`, borderRadius: 6, padding: "10px 12px", fontSize: 13, color: C.accent, fontFamily: "'Share Tech Mono',monospace" }}>{s.code}</code>}
          {s.list && <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: C.muted, lineHeight: 1.8 }}>{s.list.map((item) => <li key={item}>{item}</li>)}</ul>}
        </div>
      ))}
    </div>
  );
}

export default function TelemetryTab({ initialView = "dashboard", onNavigate }) {
  const [view, setView] = useState(initialView);
  const [serverIp, setServerIp] = useState(() => {
    try { return localStorage.getItem("ts_server_ip") || localStorage.getItem("fth_server_ip") || ""; } catch { return ""; }
  });

  const { telemetry, wsStatus, simulationActive, tutorialIps, isGameLive, toggleSimulation } = useTelemetryWs(serverIp);
  useEffect(() => { setView(initialView); }, [initialView]);

  const statusLabel =
    wsStatus !== "connected" ? "Server offline" :
    simulationActive ? "Mock data active" :
    isGameLive ? "Game connected" : "Waiting for game…";

  const statusColor =
    wsStatus !== "connected" ? C.red :
    simulationActive || isGameLive ? C.accent : C.amber;

  if (view === "setup") return <SetupGuide tutorialIps={tutorialIps} />;

  const speed = telemetry ? Math.round(telemetry.speedKmh) : 0;
  const rpm = telemetry ? Math.round(telemetry.currentEngineRpm) : 0;
  const gear = telemetry ? getGearLabel(telemetry.gear) : "N";
  const steer = telemetry ? Math.round(telemetry.steer * 100) : 0;
  const suggestedIp = tutorialIps.find((ip) => ip.startsWith("192.168.")) || tutorialIps[0] || "192.168.1.15";

  return (
    <div className="telemetry-page">
      <div className="telemetry-header">
        <img src="/logo-banner.png" alt="Track Spec" />
        <div className="telemetry-status-row">
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "6px 14px" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: statusColor, boxShadow: `0 0 8px ${statusColor}` }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: "0.06em" }}>{statusLabel}</span>
          </div>
          <button
            onClick={toggleSimulation}
            type="button"
            style={{
              background: simulationActive ? `${C.accent}22` : `${C.grey}18`,
              border: `1px solid ${simulationActive ? C.accent : C.grey}44`,
              borderRadius: 20, padding: "6px 16px", fontSize: 11, fontWeight: 700,
              color: simulationActive ? C.accent : C.grey, cursor: "pointer",
            }}
          >
            {simulationActive ? "Stop mock" : "Test mock"}
          </button>
        </div>
      </div>

      <div className="telemetry-dashboard">
        <div className="telemetry-span-full telemetry-ip-card">
          <div style={{ fontSize: 11, color: C.dim, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8 }}>
            PC Server IP
          </div>
          <input
            className="telemetry-ip-input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            placeholder={suggestedIp}
            value={serverIp}
            onChange={(e) => { setServerIp(e.target.value); try { localStorage.setItem("ts_server_ip", e.target.value); } catch {} }}
          />
          <p className="telemetry-ip-hint">
            iPhone on Wi‑Fi: enter your PC&apos;s IP above.
            <br />
            Same PC or desktop: leave blank.
          </p>
          <button type="button" onClick={() => onNavigate?.("setup")} style={{ marginTop: 10, background: "none", border: "none", color: C.accent, fontSize: 12, cursor: "pointer", padding: 0 }}>
            How to connect →
          </button>
        </div>

        <div className="telemetry-span-full telemetry-gauges">
          <GaugeCard label="Speed" value={speed} unit="km/h" />
          <GaugeCard label="RPM" value={rpm >= 1000 ? `${(rpm / 1000).toFixed(1)}k` : rpm} unit="rpm" />
          <GaugeCard label="Gear" value={gear} unit={steer !== 0 ? `steer ${steer}%` : ""} />
        </div>

        {telemetry?.carOrdinal > 0 && (
          <div className="telemetry-span-full telemetry-card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderColor: `${C.accent}33` }}>
            <span style={{ fontSize: 13, color: C.text }}>Car #{telemetry.carOrdinal}</span>
            <span style={{ fontSize: 12, fontWeight: 700, color: C.accent, background: `${C.accent}18`, padding: "3px 10px", borderRadius: 4 }}>
              {getClassLabel(telemetry.carClass)} {telemetry.carPerformanceIndex}
            </span>
          </div>
        )}

        <div className="telemetry-card" style={{ textAlign: "center" }}>
          <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 10 }}>G-Force</div>
          <GForceCanvas telemetry={telemetry} size={220} />
          <div style={{ marginTop: 8, fontSize: 12, color: C.muted, fontFamily: "'Share Tech Mono',monospace" }}>
            Lat <span style={{ color: C.grey }}>{telemetry ? telemetry.accelX.toFixed(2) : "0.00"}G</span>
            {" · "}
            Long <span style={{ color: C.accent }}>{telemetry ? telemetry.accelZ.toFixed(2) : "0.00"}G</span>
          </div>
        </div>

        <div className="telemetry-side-stack">
          <div className="telemetry-card">
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>Tire temps (°C)</div>
            <TireGrid telemetry={telemetry} />
            <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 10, color: C.dim, justifyContent: "center" }}>
              <span><span style={{ color: C.tireCold }}>●</span> Cold</span>
              <span><span style={{ color: C.tireOptimal }}>●</span> Optimal</span>
              <span><span style={{ color: C.tireHot }}>●</span> Hot</span>
            </div>
          </div>

          <div className="telemetry-card">
            <div style={{ fontSize: 10, color: C.dim, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 12 }}>Inputs</div>
            <PedalBar label="Throttle" value={telemetry?.accelInput} color={C.accent} />
            <PedalBar label="Brake" value={telemetry?.brakeInput} color={C.red} />
          </div>
        </div>
      </div>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";

import {

  createMockFrame,

  fromRelay,

  TRACK_SPEC_WS_PORT,

  type RelayFrame,

  type TelemetryFrame,

} from "../lib/telemetry";



export type WsStatus = "disconnected" | "connecting" | "connected";



const SERVER_IP_KEY = "ts_server_ip";



function defaultHost(): string {

  const h = window.location.hostname;

  if (h === "localhost" || h === "127.0.0.1" || h.startsWith("192.168.") || h.startsWith("10.")) {

    return h;

  }

  return "localhost";

}

/** When the UI is served by the relay, use the same HTTP port for WebSocket. */
function resolveWsPort(): number {
  const locPort = window.location.port;
  if (locPort && /^\d+$/.test(locPort)) {
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1" || h.startsWith("192.168.") || h.startsWith("10.")) {
      return Number(locPort);
    }
  }
  return TRACK_SPEC_WS_PORT;
}



function loadServerIp(): string {

  try {

    return localStorage.getItem(SERVER_IP_KEY) || localStorage.getItem("fth_server_ip") || "";

  } catch {

    return "";

  }

}



export function saveServerIp(ip: string) {

  try {

    localStorage.setItem(SERVER_IP_KEY, ip);

  } catch {

    /* ignore */

  }

}



export function useTelemetryWs() {

  const [serverIp, setServerIpState] = useState(loadServerIp);

  const [telemetry, setTelemetry] = useState<TelemetryFrame | null>(null);

  const [wsStatus, setWsStatus] = useState<WsStatus>("disconnected");

  const [simulationActive, setSimulationActive] = useState(false);

  const [clientMockActive, setClientMockActive] = useState(false);

  const [lastPacketTime, setLastPacketTime] = useState(0);

  const [serverOnline, setServerOnline] = useState<boolean | null>(null);

  const [tutorialIps, setTutorialIps] = useState<string[]>(["127.0.0.1"]);

  const [udpBound, setUdpBound] = useState<boolean | null>(null);

  const [udpError, setUdpError] = useState<string | null>(null);

  const [sawGame, setSawGame] = useState(false);



  const wsRef = useRef<WebSocket | null>(null);

  const simRef = useRef(false);



  const setServerIp = useCallback((ip: string) => {

    setServerIpState(ip);

    saveServerIp(ip);

  }, []);



  const isGameLive =

    !simulationActive &&

    !clientMockActive &&

    lastPacketTime > 0 &&

    Date.now() - lastPacketTime < 2500;



  const mockActive = simulationActive || clientMockActive;



  const resolveHost = useCallback(() => {

    const trimmed = serverIp.trim();

    return trimmed || defaultHost();

  }, [serverIp]);



  useEffect(() => {

    if (!clientMockActive || simulationActive) return;

    let t = 0;

    const id = setInterval(() => {

      t += 0.016;

      setTelemetry(createMockFrame(t));

      setLastPacketTime(Date.now());

    }, 16);

    return () => clearInterval(id);

  }, [clientMockActive, simulationActive]);



  useEffect(() => {

    if (clientMockActive) return;



    let ws: WebSocket | null = null;

    let reconnectTimeout: ReturnType<typeof setTimeout>;

    let cancelled = false;

    const host = resolveHost();

    const wsUrl = `ws://${host}:${resolveWsPort()}`;



    function connect() {

      if (cancelled) return;

      setWsStatus("connecting");

      ws = new WebSocket(wsUrl);

      wsRef.current = ws;



      ws.onopen = () => {

        if (!cancelled) setWsStatus("connected");

      };



      ws.onmessage = (event) => {

        try {

          const payload = JSON.parse(event.data as string) as {

            type: string;

            data?: RelayFrame & { ips?: string[] };

            active?: boolean;

          };

          if (payload.type === "telemetry" && payload.data) {

            setTelemetry(fromRelay(payload.data));

            setLastPacketTime(Date.now());

            if (!simRef.current) setSawGame(true);

          } else if (payload.type === "init" && payload.data?.ips) {

            setTutorialIps(payload.data.ips);

          } else if (payload.type === "simulation_status") {

            simRef.current = !!payload.active;

            setSimulationActive(!!payload.active);

          }

        } catch {

          /* ignore malformed */

        }

      };



      ws.onclose = () => {

        if (cancelled) return;

        setWsStatus("disconnected");

        setSimulationActive(false);

        reconnectTimeout = setTimeout(connect, 3000);

      };



      ws.onerror = () => ws?.close();

    }



    connect();



    return () => {

      cancelled = true;

      ws?.close();

      wsRef.current = null;

      if (reconnectTimeout) clearTimeout(reconnectTimeout);

    };

  }, [clientMockActive, resolveHost]);



  useEffect(() => {

    if (clientMockActive) {

      setServerOnline(null);

      return;

    }



    const host = resolveHost();

    let cancelled = false;



    async function poll() {

      const port = resolveWsPort();

      try {

        const statusRes = await fetch(`http://${host}:${port}/api/status`);

        if (cancelled) return;

        if (statusRes.ok) {

          const data = (await statusRes.json()) as {

            udpBound?: boolean;

            udpError?: string | null;

          };

          setServerOnline(true);

          setUdpBound(typeof data.udpBound === "boolean" ? data.udpBound : null);

          setUdpError(data.udpError || null);

          return;

        }

      } catch {

        /* old relay has no /api/status */

      }

      try {

        const res = await fetch(`http://${host}:${port}/ping`);

        if (cancelled) return;

        setServerOnline(res.ok);

        setUdpBound(null);

        setUdpError(null);

      } catch {

        if (!cancelled) {

          setServerOnline(false);

          setUdpBound(null);

          setUdpError(null);

        }

      }

    }



    poll();

    const id = setInterval(poll, 5000);

    return () => {

      cancelled = true;

      clearInterval(id);

    };

  }, [clientMockActive, resolveHost]);



  const toggleMock = useCallback(() => {

    const ws = wsRef.current;

    if (ws?.readyState === WebSocket.OPEN) {

      ws.send(JSON.stringify({ type: "toggle_simulation", active: !simulationActive }));

      return;

    }

    setClientMockActive((m) => !m);

  }, [simulationActive]);



  const suggestedIp =

    tutorialIps.find((ip) => ip.startsWith("192.168.")) ||

    (defaultHost().startsWith("192.168.") ? defaultHost() : "192.168.1.52");



  return {

    serverIp,

    setServerIp,

    telemetry,

    wsStatus,

    mockActive,

    simulationActive,

    clientMockActive,

    isGameLive,

    serverOnline,

    udpBound,

    udpError,

    sawGame,

    toggleMock,

    suggestedIp,

    tutorialIps,

  };

}



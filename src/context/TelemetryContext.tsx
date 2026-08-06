import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useCarOrdinals } from "../hooks/useCarOrdinals";
import { useTelemetryWs } from "../hooks/useTelemetryWs";
import type { BalanceState, TelemetryFrame } from "../lib/telemetry";

interface TelemetryContextValue extends Omit<ReturnType<typeof useTelemetryWs>, "telemetry"> {
  telemetry: TelemetryFrame | null;
  lookupCarOrdinal: (ordinal: number) => string | null;
  resolveHost: () => string;
  liveBalance: BalanceState | null;
  dismissLiveBalance: () => void;
}

const TelemetryContext = createContext<TelemetryContextValue | null>(null);

const SUSTAIN_MS = 2500;

export function TelemetryProvider({ children }: { children: ReactNode }) {
  const ws = useTelemetryWs();
  const { lookup: lookupCarOrdinal } = useCarOrdinals();
  const [liveBalance, setLiveBalance] = useState<BalanceState | null>(null);
  const [dismissed, setDismissed] = useState<BalanceState | null>(null);
  const sinceRef = useRef<number | null>(null);
  const lastBalance = useRef<BalanceState>("neutral");

  const resolveHost = () => {
    const trimmed = ws.serverIp.trim();
    if (trimmed) return trimmed;
    const h = window.location.hostname;
    if (h === "localhost" || h === "127.0.0.1" || h.startsWith("192.168.") || h.startsWith("10.")) {
      return h;
    }
    return "localhost";
  };

  useEffect(() => {
    const balance = ws.telemetry?.balance ?? "neutral";
    const racing = (ws.telemetry?.speedKmh ?? 0) > 40 && ws.telemetry?.raceMode;

    if (!racing || balance === "neutral") {
      sinceRef.current = null;
      if (liveBalance) setLiveBalance(null);
      lastBalance.current = balance;
      return;
    }

    if (balance !== lastBalance.current) {
      sinceRef.current = Date.now();
      lastBalance.current = balance;
      if (dismissed === balance) setDismissed(null);
    }

    if (sinceRef.current && Date.now() - sinceRef.current >= SUSTAIN_MS) {
      if (dismissed !== balance) setLiveBalance(balance);
    }
  }, [ws.telemetry, liveBalance, dismissed]);

  const dismissLiveBalance = () => {
    if (liveBalance) setDismissed(liveBalance);
    setLiveBalance(null);
  };

  const telemetry = useMemo((): TelemetryFrame | null => {
    const raw = ws.telemetry;
    if (!raw) return null;
    if (raw.carName) return raw;
    const resolved = lookupCarOrdinal(raw.carOrdinal);
    if (!resolved) return raw;
    return { ...raw, carName: resolved };
  }, [ws.telemetry, lookupCarOrdinal]);

  return (
    <TelemetryContext.Provider
      value={{
        ...ws,
        telemetry,
        lookupCarOrdinal,
        resolveHost,
        liveBalance,
        dismissLiveBalance,
      }}
    >
      {children}
    </TelemetryContext.Provider>
  );
}

export function useTelemetryContext() {
  const ctx = useContext(TelemetryContext);
  if (!ctx) throw new Error("useTelemetryContext requires TelemetryProvider");
  return ctx;
}

export type { TelemetryFrame };

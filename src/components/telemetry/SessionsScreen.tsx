import { useCallback, useEffect, useState } from "react";
import { compareLapTraces } from "../../lib/lapCompare";
import { exportTimingSheetImage } from "../../lib/exportTimingSheet";
import {
  deleteSession,
  downloadTextFile,
  fetchCarRecords,
  fetchClassRecords,
  fetchSession,
  fetchSessions,
  getClassLabel,
  sessionToCsv,
  updateSessionMeta,
  type CarRecord,
  type ClassRecord,
  type SessionDetail,
  type SessionSummary,
  type StoredLap,
} from "../../lib/sessions";
import { Button } from "../ui/Button";
import { Card, Label } from "../ui/Card";
import { CarRecordsBoard } from "./CarRecordsBoard";
import { ClassRecordsBoard } from "./ClassRecordsBoard";
import { LapCompareChart } from "./LapCompareChart";
import { SessionTimingSheet } from "./SessionTimingSheet";
import { StintSummaryCard } from "./StintSummaryCard";
import { TrackLabelEditor } from "./TrackLabelEditor";
import { useTelemetryContext } from "../../context/TelemetryContext";
import { useUnits } from "../../hooks/useUnits";

function carLabel(ordinal: number, lookup: (n: number) => string | null): string {
  if (ordinal <= 0) return "Unknown car";
  return lookup(ordinal) ?? `Car #${ordinal}`;
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function SessionsScreen() {
  const { serverIp, resolveHost, lookupCarOrdinal } = useTelemetryContext();
  const { units } = useUnits();
  const host = serverIp.trim() || resolveHost();

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [records, setRecords] = useState<ClassRecord[]>([]);
  const [carRecords, setCarRecords] = useState<CarRecord[]>([]);
  const [detail, setDetail] = useState<SessionDetail | null>(null);
  const [pickA, setPickA] = useState<string | null>(null);
  const [pickB, setPickB] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextSessions, nextRecords, nextCars] = await Promise.all([
        fetchSessions(host),
        fetchClassRecords(host),
        fetchCarRecords(host),
      ]);
      setSessions(nextSessions);
      setRecords(nextRecords);
      setCarRecords(nextCars);
    } catch {
      setError("Could not reach Track Spec relay — run START.bat on your PC.");
    } finally {
      setLoading(false);
    }
  }, [host]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const openSession = async (id: string) => {
    try {
      const s = await fetchSession(id, host);
      setDetail(s);
      const best = s.laps.reduce<StoredLap | null>(
        (acc, lap) => (!acc || lap.time < acc.time ? lap : acc),
        null,
      );
      setPickA(best?.id ?? s.laps[0]?.id ?? null);
      setPickB(s.laps[s.laps.length - 1]?.id ?? null);
    } catch {
      setError("Failed to load session");
    }
  };

  const pickLap = (lapId: string) => {
    if (!pickA || (pickA && pickB)) {
      setPickA(lapId);
      setPickB(null);
      return;
    }
    if (pickA === lapId) {
      setPickA(null);
      return;
    }
    setPickB(lapId);
  };

  const lapA = detail?.laps.find((l) => l.id === pickA);
  const lapB = detail?.laps.find((l) => l.id === pickB);
  const comparePoints =
    lapA && lapB ? compareLapTraces(lapA.trace, lapB.trace) : [];

  const handleDelete = async (id: string) => {
    await deleteSession(id, host);
    if (detail?.id === id) setDetail(null);
    await reload();
  };

  if (detail) {
    const usedCar = carLabel(detail.carOrdinal, lookupCarOrdinal);
    const tuneLabel = detail.tune
      ? `${detail.tune.tuneId} · ${detail.tune.make} ${detail.tune.model}`.trim()
      : null;

    return (
      <div className="mx-auto max-w-[900px] space-y-[var(--ts-section-gap)] px-4 py-5 pb-8 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="ghost" onClick={() => setDetail(null)}>
            ← Sessions
          </Button>
          <h1 className="font-[family-name:var(--ts-font-heading)] text-xl font-semibold">
            {usedCar}
          </h1>
          <p className="w-full text-xs text-[var(--ts-muted)]">{formatWhen(detail.startedAt)}</p>
          <span className="rounded-md bg-[var(--ts-accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--ts-accent)]">
            {getClassLabel(detail.carClass)} {detail.carPI}
          </span>
          {detail.trackLabel && (
            <span className="rounded-md border border-[var(--ts-border)] px-2 py-1 text-xs text-[var(--ts-text)]">
              {detail.trackLabel}
            </span>
          )}
          {detail.bestLapLabel && (
            <span className="font-[family-name:var(--ts-font-mono)] text-xs text-[var(--ts-muted)]">
              Session best {detail.bestLapLabel}
            </span>
          )}
        </div>

        <Card>
          <Label>Car used</Label>
          <p className="mt-1 text-sm text-[var(--ts-text)]">{usedCar}</p>
          <p className="mt-1 text-xs text-[var(--ts-muted)]">
            Class {getClassLabel(detail.carClass)}
            {detail.carPI > 0 ? ` · ${detail.carPI} PI` : ""}
            {detail.carOrdinal > 0 ? ` · #${detail.carOrdinal}` : ""}
          </p>
          {tuneLabel && (
            <p className="mt-2 text-xs text-[var(--ts-muted)]">
              Linked tune · <span className="text-[var(--ts-text)]">{tuneLabel}</span>
            </p>
          )}
        </Card>

        <TrackLabelEditor
          trackLabel={detail.trackLabel}
          trackTags={detail.trackTags}
          onSave={async (trackLabel, trackTags) => {
            const next = await updateSessionMeta(detail.id, { trackLabel, trackTags }, host);
            setDetail(next);
            await reload();
          }}
        />

        {detail.stint && (
          <StintSummaryCard
            stint={detail.stint}
            units={units}
            lookupCar={lookupCarOrdinal}
            trackLabel={detail.trackLabel}
            tuneLabel={tuneLabel}
          />
        )}

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            onClick={() => {
              const csv = sessionToCsv(detail, units, usedCar);
              downloadTextFile(
                `track-spec-${(detail.trackLabel || "session").replace(/\s+/g, "-").toLowerCase()}.csv`,
                csv,
              );
            }}
          >
            Export CSV
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              void exportTimingSheetImage({
                detail,
                units,
                carName: usedCar,
              })
            }
          >
            Share image
          </Button>
        </div>

        <SessionTimingSheet
          laps={detail.laps}
          sessionBest={detail.bestLap}
          units={units}
          pickA={pickA}
          pickB={pickB}
          onPickLap={pickLap}
          title="Session timing sheet"
          subtitle="Tap laps to set A (reference) and B for the delta chart. TOP is peak speed that lap."
        />

        <Card>
          <Label>Delta chart</Label>
          <LapCompareChart
            points={comparePoints}
            labelA={lapA ? `Lap ${lapA.lapNumber}` : "A"}
            labelB={lapB ? `Lap ${lapB.lapNumber}` : "B"}
          />
        </Card>

        <Button variant="outline" onClick={() => handleDelete(detail.id)}>
          Delete session
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-[var(--ts-section-gap)] px-4 py-5 pb-8 sm:px-6">
      <h1 className="font-[family-name:var(--ts-font-heading)] text-2xl font-semibold">Sessions</h1>
      <p className="text-sm text-[var(--ts-muted)]">
        Live laps save on your PC. Class/car records, track labels, stint summaries, and exports live here.
      </p>

      {loading && <p className="text-sm text-[var(--ts-muted)]">Loading…</p>}
      {error && <Card className="text-sm text-[var(--ts-danger)]">{error}</Card>}

      {!loading && !error && (
        <>
          <ClassRecordsBoard
            records={records}
            lookupCar={lookupCarOrdinal}
            onOpenSession={(id) => void openSession(id)}
          />
          <CarRecordsBoard
            records={carRecords}
            units={units}
            lookupCar={lookupCarOrdinal}
            onOpenSession={(id) => void openSession(id)}
          />
        </>
      )}

      {!loading && !error && sessions.length === 0 && (
        <Card className="text-sm text-[var(--ts-muted)]">
          No sessions yet. Drive in Forza with Data Out enabled, or use Test mock on Live — laps save when you finish each lap.
        </Card>
      )}

      <div className="space-y-3">
        {sessions.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => openSession(s.id)}
            className="w-full rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-4 text-left"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-medium">{carLabel(s.carOrdinal, lookupCarOrdinal)}</span>
              <span className="rounded-md bg-[var(--ts-accent-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--ts-accent)]">
                {getClassLabel(s.carClass)} {s.carPI}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-3 font-[family-name:var(--ts-font-mono)] text-xs text-[var(--ts-muted)]">
              <span>{formatWhen(s.startedAt)}</span>
              <span>{s.lapCount} lap{s.lapCount !== 1 ? "s" : ""}</span>
              {s.bestLapLabel && <span>Best {s.bestLapLabel}</span>}
              {s.trackLabel && <span>{s.trackLabel}</span>}
              {s.tune && <span>{s.tune.tuneId} tune</span>}
            </div>
          </button>
        ))}
      </div>

      <Button variant="outline" onClick={() => reload()}>
        Refresh
      </Button>
    </div>
  );
}

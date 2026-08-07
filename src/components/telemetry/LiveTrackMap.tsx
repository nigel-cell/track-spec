import { useEffect, useRef, useState } from "react";
import { Card, Label } from "../ui/Card";
import type { TelemetryFrame } from "../../lib/telemetry";

const CAP = 4000;
const MIN_DIST = 3;
const TELEPORT_M = 250;

interface Point {
  x: number;
  z: number;
}

interface TrackSnapshot {
  points: Point[];
  car: Point | null;
  headingX: number;
  headingZ: number;
}

function emptySnapshot(): TrackSnapshot {
  return { points: [], car: null, headingX: 0, headingZ: 1 };
}

function useLiveTrack(telemetry: TelemetryFrame | null) {
  const ref = useRef({
    points: [] as Point[],
    last: null as Point | null,
    minDist: MIN_DIST,
    carOrdinal: 0,
  });
  const [snapshot, setSnapshot] = useState<TrackSnapshot>(emptySnapshot);

  useEffect(() => {
    if (!telemetry || telemetry.speedKmh < 5) return;

    const { positionX, positionZ, yaw, carOrdinal } = telemetry;

    const s = ref.current;

    if (carOrdinal > 0 && s.carOrdinal > 0 && carOrdinal !== s.carOrdinal) {
      s.points = [];
      s.last = null;
      s.minDist = MIN_DIST;
    }
    if (carOrdinal > 0) s.carOrdinal = carOrdinal;

    const pt = { x: positionX, z: positionZ };

    if (s.last) {
      const jump = Math.hypot(pt.x - s.last.x, pt.z - s.last.z);
      if (jump < s.minDist) {
        setSnapshot({
          points: s.points,
          car: pt,
          headingX: Math.sin(yaw),
          headingZ: Math.cos(yaw),
        });
        return;
      }
      if (jump > TELEPORT_M) {
        s.points = [];
        s.last = null;
        s.minDist = MIN_DIST;
      }
    }

    s.last = pt;
    s.points.push(pt);

    if (s.points.length > CAP) {
      s.points = s.points.filter((_, i) => i % 2 === 0);
      s.minDist *= 2;
    }

    setSnapshot({
      points: [...s.points],
      car: pt,
      headingX: Math.sin(yaw),
      headingZ: Math.cos(yaw),
    });
  }, [telemetry]);

  return snapshot;
}

function drawTrack(
  canvas: HTMLCanvasElement,
  { points, car, headingX, headingZ }: TrackSnapshot,
) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  if (w === 0 || h === 0) return;

  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);

  if (points.length < 2) {
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Drive to draw your line…", w / 2, h / 2);
    return;
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minZ = Math.min(minZ, p.z);
    maxZ = Math.max(maxZ, p.z);
  }
  if (car) {
    minX = Math.min(minX, car.x);
    maxX = Math.max(maxX, car.x);
    minZ = Math.min(minZ, car.z);
    maxZ = Math.max(maxZ, car.z);
  }

  const pad = 24;
  const spanX = Math.max(maxX - minX, 40);
  const spanZ = Math.max(maxZ - minZ, 40);
  const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanZ);

  const toScreen = (p: Point) => ({
    x: pad + (p.x - minX) * scale,
    y: h - pad - (p.z - minZ) * scale,
  });

  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, h / 2);
  ctx.lineTo(w - pad, h / 2);
  ctx.moveTo(w / 2, pad);
  ctx.lineTo(w / 2, h - pad);
  ctx.stroke();

  ctx.strokeStyle = "var(--ts-accent)";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  const first = toScreen(points[0]);
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < points.length; i++) {
    const p = toScreen(points[i]);
    ctx.lineTo(p.x, p.y);
  }
  ctx.stroke();

  if (car) {
    const c = toScreen(car);
    const len = 10;
    const tipX = c.x + headingX * len;
    const tipY = c.y - headingZ * len;
    const wing = 6;
    const px = -headingZ;
    const py = -headingX;

    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.moveTo(tipX, tipY);
    ctx.lineTo(c.x + px * wing - headingX * 4, c.y + py * wing + headingZ * 4);
    ctx.lineTo(c.x - px * wing - headingX * 4, c.y - py * wing + headingZ * 4);
    ctx.closePath();
    ctx.fill();
  }
}

interface LiveTrackMapProps {
  telemetry: TelemetryFrame | null;
  variant?: "default" | "fill" | "compact";
}

export function LiveTrackMap({ telemetry, variant = "default" }: LiveTrackMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const track = useLiveTrack(telemetry);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const redraw = () => drawTrack(canvas, track);

    redraw();

    const ro = new ResizeObserver(redraw);
    ro.observe(canvas);
    window.addEventListener("resize", redraw);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", redraw);
    };
  }, [track]);

  if (variant === "fill") {
    return (
      <div className="flex h-full min-h-0 flex-col p-3">
        <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
          <span className="font-[family-name:var(--ts-font-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--ts-muted)]">
            Track map
          </span>
          {track.points.length > 0 && (
            <span className="font-[family-name:var(--ts-font-mono)] text-[9px] text-[var(--ts-muted)]">
              {track.points.length} pts
            </span>
          )}
        </div>
        <div className="relative min-h-0 flex-1">
          <canvas ref={canvasRef} className="absolute inset-0 h-full w-full rounded-[var(--ts-radius-sm)] bg-[var(--ts-bg)]" />
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div className="rounded-[var(--ts-radius-md)] border border-[var(--ts-border)] bg-[var(--ts-card)] p-2">
        <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
          <span className="font-[family-name:var(--ts-font-mono)] text-[9px] uppercase tracking-wider text-[var(--ts-muted)]">
            Track map
          </span>
          {track.points.length > 0 && (
            <span className="font-[family-name:var(--ts-font-mono)] text-[9px] text-[var(--ts-dim)]">
              {track.points.length} pts
            </span>
          )}
        </div>
        <canvas
          ref={canvasRef}
          className="h-28 w-full rounded-[var(--ts-radius-sm)] bg-[var(--ts-bg)]"
        />
      </div>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <Label>Track map</Label>
        {track.points.length > 0 && (
          <span className="font-[family-name:var(--ts-font-mono)] text-[10px] text-[var(--ts-muted)]">
            {track.points.length} pts
          </span>
        )}
      </div>
      <canvas
        ref={canvasRef}
        className="h-48 w-full rounded-[var(--ts-radius-sm)] bg-[var(--ts-bg)] md:h-56"
      />
    </Card>
  );
}

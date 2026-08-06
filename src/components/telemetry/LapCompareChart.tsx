import { useEffect, useRef } from "react";
import type { ComparePoint } from "../../lib/lapCompare";
import { formatDelta } from "../../lib/lapCompare";

interface LapCompareChartProps {
  points: ComparePoint[];
  labelA: string;
  labelB: string;
}

export function LapCompareChart({ points, labelA, labelB }: LapCompareChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || points.length < 2) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const pad = { l: 44, r: 12, t: 12, b: 28 };
    const plotW = w - pad.l - pad.r;
    const plotH = h - pad.t - pad.b;

    const minD = points[0].dist;
    const maxD = points[points.length - 1].dist;
    let minDelta = 0;
    let maxDelta = 0;
    for (const p of points) {
      minDelta = Math.min(minDelta, p.delta);
      maxDelta = Math.max(maxDelta, p.delta);
    }
    const margin = Math.max(0.05, (maxDelta - minDelta) * 0.1);
    minDelta -= margin;
    maxDelta += margin;
    const spanD = maxD - minD || 1;
    const spanDelta = maxDelta - minDelta || 0.1;

    const x = (d: number) => pad.l + ((d - minD) / spanD) * plotW;
    const y = (delta: number) => pad.t + plotH - ((delta - minDelta) / spanDelta) * plotH;

    ctx.strokeStyle = "rgba(255,255,255,0.12)";
    ctx.lineWidth = 1;
    const zeroY = y(0);
    if (zeroY >= pad.t && zeroY <= pad.t + plotH) {
      ctx.beginPath();
      ctx.moveTo(pad.l, zeroY);
      ctx.lineTo(pad.l + plotW, zeroY);
      ctx.stroke();
    }

    ctx.strokeStyle = "var(--ts-accent)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    points.forEach((p, i) => {
      const px = x(p.dist);
      const py = y(p.delta);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    });
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "10px system-ui, sans-serif";
    ctx.fillText(`${labelA} vs ${labelB}`, pad.l, h - 8);

    const last = points[points.length - 1];
    ctx.fillStyle = last.delta >= 0 ? "var(--ts-warning)" : "var(--ts-success)";
    ctx.fillText(formatDelta(last.delta), pad.l + plotW - 52, pad.t + 12);
  }, [points, labelA, labelB]);

  if (points.length < 2) {
    return (
      <div className="flex h-40 items-center justify-center rounded-[var(--ts-radius-sm)] bg-[var(--ts-bg)] text-xs text-[var(--ts-muted)]">
        Select two laps to compare
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      className="h-40 w-full rounded-[var(--ts-radius-sm)] bg-[var(--ts-bg)] md:h-48"
    />
  );
}

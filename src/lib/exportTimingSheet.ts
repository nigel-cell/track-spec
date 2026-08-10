import { buildTimingSheetRows, getClassLabel, type SessionDetail } from "./sessions";
import { formatDelta } from "./lapTime";
import { formatSpeedKmh, type TuneUnits } from "./units";

/** Render a shareable PNG of the session timing sheet. */
export async function exportTimingSheetImage(options: {
  detail: SessionDetail;
  units: TuneUnits;
  carName: string;
  filename?: string;
}): Promise<void> {
  const { detail, units, carName } = options;
  const rows = buildTimingSheetRows(detail.laps, detail.bestLap);
  const width = 900;
  const rowH = 34;
  const headerH = 150;
  const height = headerH + 40 + rows.length * rowH + 40;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = Math.max(height, 280);
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#0b0d10";
  ctx.fillRect(0, 0, width, canvas.height);

  ctx.fillStyle = "#f5f7fa";
  ctx.font = "600 28px system-ui, sans-serif";
  ctx.fillText("Track Spec · Timing Sheet", 40, 48);

  ctx.fillStyle = "#9aa3ad";
  ctx.font = "400 16px system-ui, sans-serif";
  ctx.fillText(carName, 40, 78);
  const meta = [
    `${getClassLabel(detail.carClass)} ${detail.carPI}`,
    detail.trackLabel || "Untagged track",
    detail.tune ? `${detail.tune.tuneId} tune` : null,
    detail.bestLapLabel ? `Best ${detail.bestLapLabel}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  ctx.fillText(meta, 40, 102);

  const cols = [
    { x: 40, label: "LAP" },
    { x: 120, label: "TIME" },
    { x: 280, label: "GAP" },
    { x: 400, label: "TOP" },
    { x: 560, label: "PREV" },
  ];
  ctx.fillStyle = "#6b7280";
  ctx.font = "600 12px system-ui, sans-serif";
  const y0 = headerH;
  for (const col of cols) ctx.fillText(col.label, col.x, y0);

  ctx.font = "600 18px ui-monospace, SFMono-Regular, Menlo, monospace";
  rows.forEach((row, i) => {
    const y = y0 + 28 + i * rowH;
    ctx.fillStyle = row.isBest ? "#34d399" : "#e5e7eb";
    ctx.fillText(String(row.lapNumber), cols[0].x, y);
    ctx.fillText(row.timeLabel, cols[1].x, y);
    ctx.fillStyle = row.isBest ? "#34d399" : "#fbbf24";
    ctx.fillText(row.isBest ? "—" : formatDelta(row.gapToBest), cols[2].x, y);
    ctx.fillStyle = row.isTopSpeedBest ? "#34d399" : "#e5e7eb";
    ctx.fillText(formatSpeedKmh(row.topSpeedKmh, units), cols[3].x, y);
    ctx.fillStyle = "#9aa3ad";
    ctx.fillText(row.gapToPrev == null ? "—" : formatDelta(row.gapToPrev), cols[4].x, y);
  });

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png"),
  );
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download =
    options.filename ||
    `track-spec-${(detail.trackLabel || "session").replace(/\s+/g, "-").toLowerCase()}.png`;
  a.click();
  URL.revokeObjectURL(url);
}

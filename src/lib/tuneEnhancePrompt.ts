import { TUNE_MODES, TUNE_TAB_ORDER } from "../data/constants";
import type { TuneConfig } from "../components/tune/TuneInputScreen";
import type { CalcTuneResult } from "./calcTune";
import type { TuneUnits } from "./units";
import { isMetric, resolveTuneUnits, speedLabel, weightLabel } from "./units";

export const ENHANCE_LOCK_SECTIONS = [
  "Tires",
  "Compound",
  "Aero",
  "Gearing",
  "Differential",
  "Springs",
] as const;

export type EnhanceLockSection = (typeof ENHANCE_LOCK_SECTIONS)[number];

export interface EnhancePromptOptions {
  userGoal?: string;
  locks?: Partial<Record<EnhanceLockSection, boolean>>;
}

export function buildEnhancePrompt(
  config: TuneConfig,
  pages: CalcTuneResult,
  feelBalance: number,
  feelAggression: number,
  options: EnhancePromptOptions = {},
  appUnits?: TuneUnits,
): string {
  const { userGoal = "", locks = {} } = options;
  const mode = TUNE_MODES.find((t) => t.id === config.tuneId);
  const dt = config.driveType;
  const units = resolveTuneUnits(config.units, appUnits);

  const allValues: string[] = [];
  for (const pg of TUNE_TAB_ORDER) {
    const d = pages[pg];
    if (!d?.values?.length) continue;
    for (const row of d.values) {
      allValues.push(`${pg}/${row.key}: ${row.value}`);
    }
  }

  const balIntent =
    feelBalance < 40
      ? "Stable/planted — front biased, favors understeer"
      : feelBalance > 60
        ? "Tail-happy — rear bias, more rotation"
        : "Neutral balance";

  const aggIntent =
    feelAggression < 40
      ? "Conservative/planted — soft damping and ARB"
      : feelAggression > 60
        ? "Aggressive/sharp — stiffer damping and ARB"
        : "Moderate aggression";

  const wKg = isMetric(units) ? config.weight : config.weight / 2.205;
  const torqNm = isMetric(units) ? (config.maxTorque ?? 500) : (config.maxTorque ?? 500) * 1.356;
  const pwrWt = torqNm / wKg;
  const compound = config.compound ?? "Sport";
  const topSpeedLabel = speedLabel(units);

  const arbRanges =
    dt === "AWD"
      ? "AWD ARB: front 22–30, rear 28–38"
      : dt === "RWD"
        ? "RWD ARB: front 18–25, rear 25–35"
        : "FWD ARB: front 8–15, rear 25–40";

  const diffRanges =
    dt === "AWD"
      ? "AWD diff: accel 25–40%, decel 0–15%, center ~65%"
      : dt === "RWD"
        ? "RWD diff: accel 25–65% road, decel 0–15%"
        : "FWD diff: accel 15–30%, decel 0–10%";

  const locked = ENHANCE_LOCK_SECTIONS.filter((k) => locks[k])
    .map((k) => (k === "Compound" ? "Tires/compound" : k))
    .join(", ");

  const lines: string[] = [
    "You are an expert Forza Horizon 6 handling tuner. Review this setup and give concise, actionable feedback.",
    "",
    "FH6 CONSTRAINTS:",
    "- Front camber more negative than rear",
    "- Rebound higher than bump (~1.6–2.0×)",
    "- Spring frequency ~2.4–2.7 Hz road (lower rally/offroad)",
    `- ${arbRanges}`,
    `- ${diffRanges}`,
    "- Brake bias road: AWD/FWD 48–52%, RWD 50–55%",
    "",
    `MODE: ${mode?.label ?? config.tuneId} on ${config.surface ?? "Road"}`,
    "",
    "CAR:",
    `${config.make} ${config.model} | ${dt} | ${config.carClass} ${config.pi} PI`,
    `Weight: ${config.weight} ${weightLabel(units)} | ${config.weightDist}% front`,
    `Engine: ~${Math.round(torqNm)} Nm | Peak ${config.peakTorqueRpm ?? "n/a"} rpm | Redline ${config.redlineRpm ?? "n/a"} | Top ${config.topspeed ?? "n/a"} ${topSpeedLabel}`,
    `Compound: ${compound} | Torque/weight: ${pwrWt.toFixed(2)} Nm/kg`,
    "",
    "USER FEEL (intentional bias — do not override unless extreme):",
    `- Balance ${feelBalance}%: ${balIntent}`,
    `- Aggression ${feelAggression}%: ${aggIntent}`,
    "",
  ];

  if (userGoal.trim()) {
    lines.push("DRIVER REQUEST:", userGoal.trim(), "");
  }

  if (locked) {
    lines.push(`DO NOT suggest changes to: ${locked}`, "");
  }

  lines.push(
    "CURRENT TUNE VALUES:",
    allValues.join("\n"),
    "",
    "Respond with:",
    "1. What this tune prioritizes (1–2 sentences)",
    "2. Values that look off vs FH6 meta for this car — specific numbers to try",
    "3. Top 3 changes in priority order (setting, direction, why)",
    "4. One driving technique tip for this setup",
    "",
    "Plain English. Be specific with numbers. No JSON.",
  );

  return lines.join("\n");
}

export async function copyEnhancePrompt(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

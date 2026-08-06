const fs = require("fs");
const lines = fs.readFileSync("src/TuneTab.jsx", "utf8").split("\n");

const offline = lines.slice(1018, 1025).join("\n").replace("const OFFLINE_FIXES", "export const OFFLINE_FIXES");
const phase = lines.slice(1027, 1043).join("\n").replace("const PHASE_FIXES", "export const PHASE_FIXES");

const problemsRaw = lines.slice(141, 153).join("\n");
const problems = problemsRaw
  .replace(/^const PROBLEMS = /, "")
  .replace(/icon:"[^"]+",\s*/g, "")
  .trim()
  .replace(/;$/, "");

const header = `// Ported from TuneTab.jsx — offline Fine Tune knowledge base

export type FixNudgeType = "balance" | "aggression" | "page";

export interface FixNudge {
  type: FixNudgeType;
  delta?: number;
  page?: string;
  label?: string;
}

export interface FixItem {
  setting: string;
  change: string;
  why: string;
  nudge?: FixNudge;
}

export interface FixResult {
  diagnosis: string;
  fixes: FixItem[];
  tip: string;
}

export interface ProblemSub {
  id: string;
  label: string;
}

export interface ProblemDef {
  id: string;
  label: string;
  desc: string;
  subs: ProblemSub[];
}

export const PROBLEMS: ProblemDef[] = ${problems};

${offline.replace(/;$/, "")} as Record<string, FixResult>;

${phase.replace(/;$/, "")} as Record<string, FixResult>;

export function getPhaseFix(problem: ProblemDef, sub: ProblemSub | null): FixResult {
  const key = sub?.id;
  if (key && PHASE_FIXES[key]) return PHASE_FIXES[key];
  const base = OFFLINE_FIXES[problem.id] ?? OFFLINE_FIXES.understeer;
  return sub
    ? { ...base, diagnosis: base.diagnosis + " Happens " + sub.label.toLowerCase() + "." }
    : base;
}

export const LIVE_PHASE_BY_PROBLEM: Record<string, string> = {
  understeer: "us_mid",
  oversteer: "os_mid",
};

export function getLiveFix(problemId: string): FixResult {
  const problem = PROBLEMS.find((p) => p.id === problemId) ?? PROBLEMS[0];
  const phaseId = LIVE_PHASE_BY_PROBLEM[problemId];
  const sub = problem.subs.find((s) => s.id === phaseId) ?? null;
  return getPhaseFix(problem, sub);
}

export function applyFixNudge(
  nudge: FixNudge,
  ctx: {
    balance: number;
    aggression: number;
    onBalance: (v: number) => void;
    onAggression: (v: number) => void;
    onPage?: (page: string) => void;
  },
): string | null {
  if (nudge.type === "balance" && nudge.delta != null) {
    ctx.onBalance(Math.max(0, Math.min(100, ctx.balance + nudge.delta)));
  } else if (nudge.type === "aggression" && nudge.delta != null) {
    ctx.onAggression(Math.max(0, Math.min(100, ctx.aggression + nudge.delta)));
  }
  if (nudge.page) ctx.onPage?.(nudge.page);
  return nudge.label ?? "Adjustment applied";
}
`;

fs.writeFileSync("src/lib/fineTuneFixes.ts", header);
console.log("Wrote fineTuneFixes.ts");

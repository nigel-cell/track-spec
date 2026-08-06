// Ported from TuneTab.jsx — offline Fine Tune knowledge base

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

export const PROBLEMS: ProblemDef[] = [
  {id:"understeer", label:"Understeer",        desc:"Car pushes wide",
   subs:[{id:"us_entry",label:"Corner entry"},{id:"us_mid",label:"Mid-corner"},{id:"us_exit",label:"On throttle"},{id:"us_high",label:"High speed only"}]},
  {id:"oversteer",  label:"Oversteer",          desc:"Rear steps out",
   subs:[{id:"os_entry",label:"Corner entry"},{id:"os_mid",label:"Mid-corner snap"},{id:"os_exit",label:"On throttle"},{id:"os_hi",label:"High speed"}]},
  {id:"braking",    label:"Braking instability",desc:"Dives, locks, pulls",
   subs:[{id:"br_lock",label:"Front locking"},{id:"br_rear",label:"Rear locking"},{id:"br_dive",label:"Nose dive"},{id:"br_late",label:"Braking too long"}]},
  {id:"sluggish",   label:"Sluggish / numb",    desc:"Car won't respond",
   subs:[{id:"ur_steer",label:"Steering numb"},{id:"ur_roll",label:"Too much roll"},{id:"ur_trac",label:"Poor traction"},{id:"ur_boost",label:"Turbo lag"}]},
  {id:"twitchy",    label:"Twitchy / snappy",   desc:"Nervous, unpredictable",
   subs:[{id:"tw_str",label:"Nervous on straights"},{id:"tw_bump",label:"Bouncy over bumps"},{id:"tw_snap",label:"Snaps unexpectedly"},{id:"tw_stiff",label:"Too stiff / harsh"}]},
];

export const OFFLINE_FIXES = {
  understeer:{diagnosis:"Front tires losing grip before rears. Usually front spring too stiff, too little front negative camber, or front ARB too high.",fixes:[{setting:"Front ARB",change:"Reduce by 3–5",why:"Softer front ARB allows more weight transfer to front tires",nudge:{type:"aggression",delta:-5,page:"Antiroll Bars",label:"Soften ARBs"}},{setting:"Front Camber",change:"Add 0.3° more negative",why:"More contact patch under cornering load",nudge:{type:"page",page:"Alignment",label:"Open Alignment"}},{setting:"Rear ARB",change:"Increase by 2–3",why:"Shifts balance rearward, encouraging rotation",nudge:{type:"aggression",delta:5,page:"Antiroll Bars",label:"Stiffen rear ARB"}}],tip:"Trail brake deeper into corners — releasing mid-corner shifts weight forward and helps rotation."},
  oversteer:{diagnosis:"Rear tires breaking traction first. Usually rear spring too stiff, too little rear camber, or diff acceleration too aggressive.",fixes:[{setting:"Rear ARB",change:"Reduce by 3–5",why:"Softer rear ARB improves rear grip",nudge:{type:"aggression",delta:-5,page:"Antiroll Bars",label:"Soften ARBs"}},{setting:"Rear Accel Diff",change:"Reduce by 10–15%",why:"Less locking on acceleration stops rear stepping out",nudge:{type:"page",page:"Differential",label:"Open Differential"}},{setting:"Balance",change:"Shift toward Stable",why:"More front bias plants the nose and calms rotation",nudge:{type:"balance",delta:-10,page:"Springs",label:"Stabilize balance"}}],tip:"Smooth progressive throttle — power oversteer is most controllable with a patient right foot."},
  braking:{diagnosis:"Improper brake bias or excessive pressure causing lockup or instability under braking.",fixes:[{setting:"Brake Balance",change:"Add 3–5% rear",why:"Reducing front bias prevents front lockup",nudge:{type:"page",page:"Brake",label:"Open Brakes"}},{setting:"Brake Pressure",change:"Reduce by 10–15%",why:"More modulation range, prevents lockup",nudge:{type:"page",page:"Brake",label:"Open Brakes"}},{setting:"Front Bump",change:"Increase by 0.5",why:"Reduces nose dive, keeps braking forces stable",nudge:{type:"aggression",delta:3,page:"Damping",label:"Stiffen damping"}}],tip:"Trail brake: hold 20–30% brake pressure as you begin to steer, release as you increase angle."},
  sluggish:{diagnosis:"Car too softly sprung or diff too open, causing slow weight transfer and lazy response.",fixes:[{setting:"Front/Rear ARB",change:"Increase both by 3",why:"Stiffer ARB reduces body roll, faster response",nudge:{type:"aggression",delta:8,page:"Antiroll Bars",label:"Sharpen response"}},{setting:"Rear Accel Diff",change:"Increase by 10%",why:"More lock gets power down faster",nudge:{type:"page",page:"Differential",label:"Open Differential"}},{setting:"Aggression",change:"Raise feel slider",why:"Stiffer springs and damping improve turn-in",nudge:{type:"aggression",delta:10,page:"Springs",label:"Add aggression"}}],tip:"On a controller: try increasing steering sensitivity in game assists — car may be responding but input range is too small."},
  twitchy:{diagnosis:"Excessive stiffness — too much ARB, too stiff springs, or damping transmitting inputs directly.",fixes:[{setting:"Front/Rear ARB",change:"Reduce both by 4–5",why:"Softer ARB smooths out transitions, reduces snap",nudge:{type:"aggression",delta:-8,page:"Antiroll Bars",label:"Soften ARBs"}},{setting:"Bump Damping",change:"Reduce front/rear by 0.5",why:"Lets car absorb surface irregularities",nudge:{type:"aggression",delta:-5,page:"Damping",label:"Soften damping"}},{setting:"Balance",change:"Shift toward Stable",why:"Plants the car and reduces nervous rotation",nudge:{type:"balance",delta:-8,page:"Springs",label:"Stabilize balance"}}],tip:"Check tire pressures first — overinflated tires have a smaller contact patch and much less stability."},
} as Record<string, FixResult>;

export const PHASE_FIXES = {
  us_entry:{diagnosis:"Front tires won't bite on turn-in — weight hasn't transferred forward yet, or front end is too stiff.",fixes:[{setting:"Front ARB",change:"Soften 3–5 points",why:"Stiff front resists turn-in; softer front loads the outside tire faster",nudge:{type:"aggression",delta:-6,page:"Antiroll Bars",label:"Soften front ARB"}},{setting:"Front tire pressure",change:"Lower 0.5 PSI",why:"More contact patch on the lighter-loaded front",nudge:{type:"page",page:"Tires",label:"Open Tires"}},{setting:"Balance",change:"+8 toward rotation",why:"Relatively softer rear spring helps the car rotate into the apex",nudge:{type:"balance",delta:8,page:"Springs",label:"Add rotation"}}],tip:"Trail brake into the corner — keep light brake pressure until the nose loads."},
  us_mid:{diagnosis:"Mid-corner push — front contact patch is overloaded while you're at steady throttle.",fixes:[{setting:"Front ARB",change:"Soften 3–4 points",why:"Allows more front grip under sustained lateral load",nudge:{type:"aggression",delta:-5,page:"Antiroll Bars",label:"Soften front ARB"}},{setting:"Front camber",change:"Add 0.2° negative",why:"Keeps the tire flat under cornering load",nudge:{type:"page",page:"Alignment",label:"Open Alignment"}},{setting:"Front downforce",change:"Increase if aero equipped",why:"Adds front grip at speed without stiffening springs",nudge:{type:"page",page:"Aero",label:"Open Aero"}}],tip:"Ease off throttle slightly mid-corner to transfer weight forward, then re-apply smoothly."},
  us_exit:{diagnosis:"Front washes out when you apply power — common on AWD/FWD when diff sends torque to the front.",fixes:[{setting:"Front diff accel",change:"Reduce 5–10%",why:"Less front torque pull reduces push on exit",nudge:{type:"page",page:"Differential",label:"Open Differential"}},{setting:"Rear spring",change:"Stiffen slightly",why:"Transfers weight rearward under acceleration",nudge:{type:"balance",delta:-5,page:"Springs",label:"Plant rear"}},{setting:"Rear ARB",change:"Stiffen 2–3 points",why:"Helps rear axle take power without front sliding",nudge:{type:"aggression",delta:4,page:"Antiroll Bars",label:"Stiffen rear"}}],tip:"Wait until the car is straightening before full throttle — patience on exit saves PI."},
  us_high:{diagnosis:"High-speed understeer — aero or front stiffness can't keep the nose planted at speed.",fixes:[{setting:"Front downforce",change:"Increase",why:"Mechanical grip alone may not be enough at high speed",nudge:{type:"page",page:"Aero",label:"Open Aero"}},{setting:"Front ARB",change:"Soften 2–3 points",why:"High-speed corners need compliance, not stiffness",nudge:{type:"aggression",delta:-4,page:"Antiroll Bars",label:"Soften front"}},{setting:"Caster",change:"Raise toward 6.5–7.0°",why:"More caster stabilizes the front at speed",nudge:{type:"page",page:"Alignment",label:"Open Alignment"}}],tip:"Brake earlier at high speed — less trail braking needed when aero is doing the work."},
  os_entry:{diagnosis:"Rear steps out on corner entry — often lift-off oversteer or rear brake bias too high.",fixes:[{setting:"Rear diff decel",change:"Reduce 5–10%",why:"Less engine braking lock on the rear axle",nudge:{type:"page",page:"Differential",label:"Open Differential"}},{setting:"Brake balance",change:"Shift 2–3% forward",why:"More front braking keeps the rear planted on entry",nudge:{type:"page",page:"Brake",label:"Open Brakes"}},{setting:"Balance",change:"Toward Stable (−8)",why:"Front-biased springs resist rear rotation on entry",nudge:{type:"balance",delta:-8,page:"Springs",label:"Stabilize entry"}}],tip:"Release the brake smoothly — a sudden lift transfers weight rearward and snaps the tail."},
  os_mid:{diagnosis:"Mid-corner snap — rear loses grip while you're holding steady steering.",fixes:[{setting:"Rear ARB",change:"Soften 4–5 points",why:"Stiff rear ARB overloads the outside rear tire mid-corner",nudge:{type:"aggression",delta:-6,page:"Antiroll Bars",label:"Soften rear ARB"}},{setting:"Rear camber",change:"Add 0.2° negative",why:"More rear contact patch under lateral load",nudge:{type:"page",page:"Alignment",label:"Open Alignment"}},{setting:"Rear rebound",change:"Soften slightly",why:"Lets rear suspension comply instead of skipping",nudge:{type:"aggression",delta:-4,page:"Damping",label:"Soften rear damp"}}],tip:"Smooth steering inputs — sawing the wheel loads and unloads the rear unpredictably."},
  os_exit:{diagnosis:"Power oversteer on exit — rear tires can't handle acceleration torque.",fixes:[{setting:"Rear diff accel",change:"Reduce 10–15%",why:"Less lock = rear wheels can slip independently under power",nudge:{type:"page",page:"Differential",label:"Open Differential"}},{setting:"Rear tire pressure",change:"Lower 0.5 PSI",why:"Larger contact patch helps put power down",nudge:{type:"page",page:"Tires",label:"Open Tires"}},{setting:"Balance",change:"Toward Stable (−10)",why:"Plants the rear under acceleration",nudge:{type:"balance",delta:-10,page:"Springs",label:"Plant rear"}}],tip:"Feed throttle progressively — 50%, then 75%, then full only when straight."},
  os_hi:{diagnosis:"High-speed instability — rear lacks downforce or damping can't control yaw.",fixes:[{setting:"Rear downforce",change:"Increase",why:"Rear aero is the primary high-speed stability tool",nudge:{type:"page",page:"Aero",label:"Open Aero"}},{setting:"Rear ARB",change:"Soften 3 points",why:"Compliance beats stiffness at very high lateral loads",nudge:{type:"aggression",delta:-5,page:"Antiroll Bars",label:"Soften rear"}},{setting:"Balance",change:"Toward Stable (−8)",why:"Reduces nervous rotation on fast sweepers",nudge:{type:"balance",delta:-8,page:"Springs",label:"Stabilize"}}],tip:"Small steering corrections at high speed — large inputs cause oscillation."},
  br_lock:{diagnosis:"Front wheels locking under braking — too much pressure or too much front bias.",fixes:[{setting:"Brake pressure",change:"Reduce 10%",why:"More headroom before lockup",nudge:{type:"page",page:"Brake",label:"Open Brakes"}},{setting:"Brake balance",change:"Shift 2% rearward",why:"Shares braking force, reduces front lock tendency",nudge:{type:"page",page:"Brake",label:"Open Brakes"}},{setting:"Front bump",change:"Increase 0.5",why:"Controls nose dive so tires stay loaded evenly",nudge:{type:"aggression",delta:3,page:"Damping",label:"Stiffen front bump"}}],tip:"Pulse the brake on controller — ABS threshold is easier to hold with rhythm."},
  br_rear:{diagnosis:"Rear locking or spinning under braking — rear bias too high or rear too light.",fixes:[{setting:"Brake balance",change:"Shift 3–5% forward",why:"Front axle does most of the stopping work safely",nudge:{type:"page",page:"Brake",label:"Open Brakes"}},{setting:"Rear diff decel",change:"Reduce 5%",why:"Less engine-braking snap on the rear",nudge:{type:"page",page:"Differential",label:"Open Differential"}},{setting:"Balance",change:"Toward Stable",why:"More front weight under braking",nudge:{type:"balance",delta:-6,page:"Springs",label:"Stabilize"}}],tip:"Brake in a straight line before turning — trail braking is advanced; master straight-line first."},
  tw_bump:{diagnosis:"Car bounces after bumps — rebound damping too low or springs too soft.",fixes:[{setting:"Rebound damping",change:"Increase 0.5–1.0",why:"Controls how fast suspension returns after compression",nudge:{type:"aggression",delta:6,page:"Damping",label:"Stiffen rebound"}},{setting:"Bump damping",change:"Increase 0.3",why:"Slows compression on impact",nudge:{type:"aggression",delta:4,page:"Damping",label:"Stiffen bump"}},{setting:"Springs",change:"Stiffen slightly",why:"Less travel = less oscillation",nudge:{type:"aggression",delta:5,page:"Springs",label:"Stiffen springs"}}],tip:"If still bouncy after damping, check ride height — bottoming out feels like bounce."},
  tw_snap:{diagnosis:"Unexpected snap oversteer — usually a transition problem (brake release or throttle).",fixes:[{setting:"Rear ARB",change:"Soften 4 points",why:"Reduces sudden rear grip loss in transitions",nudge:{type:"aggression",delta:-7,page:"Antiroll Bars",label:"Soften rear"}},{setting:"Rear diff decel",change:"Reduce 5–10%",why:"Less aggressive engine braking on lift-off",nudge:{type:"page",page:"Differential",label:"Open Differential"}},{setting:"Balance",change:"Toward Stable",why:"Predictable front-biased balance resists snap",nudge:{type:"balance",delta:-10,page:"Springs",label:"Stabilize"}}],tip:"One input at a time — don't brake, steer, and throttle simultaneously."},
  ur_steer:{diagnosis:"Steering feels numb — car responds slowly to wheel input.",fixes:[{setting:"Front ARB",change:"Stiffen 3 points",why:"Faster weight transfer = quicker turn-in",nudge:{type:"aggression",delta:6,page:"Antiroll Bars",label:"Sharpen turn-in"}},{setting:"Front rebound",change:"Increase 0.5",why:"Snappier front suspension response",nudge:{type:"aggression",delta:5,page:"Damping",label:"Stiffen front damp"}},{setting:"Aggression",change:"Raise +10",why:"Overall stiffer setup = sharper response",nudge:{type:"aggression",delta:10,page:"Springs",label:"Add aggression"}}],tip:"Check in-game steering sensitivity — the car may be fine but your input range is small."},
  ur_trac:{diagnosis:"Poor traction off corners — diff too open or rear too soft.",fixes:[{setting:"Rear diff accel",change:"Increase 5–10%",why:"More lock puts power down through both rear wheels",nudge:{type:"page",page:"Differential",label:"Open Differential"}},{setting:"Rear tire pressure",change:"Lower 0.5 PSI",why:"Wider contact patch for acceleration",nudge:{type:"page",page:"Tires",label:"Open Tires"}},{setting:"Rear ARB",change:"Stiffen 2–3",why:"Keeps rear planted under power",nudge:{type:"aggression",delta:5,page:"Antiroll Bars",label:"Stiffen rear"}}],tip:"Short-shift if spinning — less torque at the wheels means more grip."},
} as Record<string, FixResult>;

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

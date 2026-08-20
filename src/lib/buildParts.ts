/** FH6 upgrade-menu parts a Track Spec build needs before you enter sliders. */

export interface BuildPartsInput {
  mode?: string;
  includeGearing?: boolean;
  engineSwap?: string;
  drivetrainSwap?: string;
  weightPackage?: string;
  chassisPackage?: string;
  powerStage?: string;
  tirePackage?: string;
  transPackage?: string;
  brakePackage?: string;
  aeroPackage?: string;
  compound?: string;
  tireWF?: string;
  tireWR?: string;
}

export interface BuildPartRow {
  slot: string;
  part: string;
}

export interface BuildPartGroup {
  menu: string;
  items: BuildPartRow[];
}

export interface BuildPartsList {
  hint: string;
  groups: BuildPartGroup[];
}

const WEIGHT: Record<string, string> = {
  street: "Street — spare, tools, light interior",
  sport: "Sport — seats, battery, glass",
  race: "Race — full strip",
};

const CHASSIS: Record<string, string> = {
  braced: "Chassis Reinforcement (brace)",
  cage: "Roll Cage",
};

const POWER: Record<string, string> = {
  stage1: "Intake, exhaust, tune",
  stage2: "Stage 2 — cams / headers",
  stage3: "Stage 3 — forced induction path",
  race: "Race internals / race ECU",
};

const TIRES: Record<string, string> = {
  sport: "Sport",
  semi: "Race Semi-Slick",
  slick: "Race Slick",
  rally: "Rally",
  drag: "Drag",
};

const TRANS: Record<string, string> = {
  sport: "Sport",
  race: "Race",
  sequential: "Sequential",
};

const BRAKES: Record<string, string> = {
  street: "Street",
  sport: "Sport",
  race: "Race",
  carbon: "Carbon Ceramic",
};

const AERO: Record<string, string[]> = {
  splitter: ["Front Bumper — splitter / lip"],
  wing: ["Rear Wing — wing"],
  track: ["Front Bumper — splitter", "Rear Wing — wing"],
  max: ["Front Bumper — race", "Rear Wing — race", "Rear Bumper — race"],
};

function isStockSwap(value?: string) {
  return !value || value === "None (Stock)";
}

/** In-game parts to buy for this build. Stock engine/chassis are listed so you don't over-upgrade. */
export function buildPartsList(config: BuildPartsInput): BuildPartsList {
  const platform: BuildPartRow[] = [];
  const drivetrain: BuildPartRow[] = [];
  const tires: BuildPartRow[] = [];
  const engine: BuildPartRow[] = [];
  const aero: BuildPartRow[] = [];
  const conversions: BuildPartRow[] = [];

  if (!isStockSwap(config.engineSwap)) {
    conversions.push({ slot: "Engine swap", part: config.engineSwap! });
  }
  if (!isStockSwap(config.drivetrainSwap)) {
    conversions.push({ slot: "Drivetrain", part: config.drivetrainSwap! });
  }

  const power = POWER[config.powerStage ?? "stock"];
  engine.push({ slot: "Engine upgrades", part: power ?? "Leave stock" });

  platform.push({
    slot: "Weight Reduction",
    part: WEIGHT[config.weightPackage ?? "stock"] ?? "Leave stock",
  });
  const chassis = CHASSIS[config.chassisPackage ?? "stock"];
  platform.push({ slot: "Chassis Reinforcement", part: chassis ?? "Leave stock" });
  platform.push({ slot: "Springs", part: "Race" });
  platform.push({ slot: "Dampers", part: "Race" });
  platform.push({ slot: "Anti-roll Bars", part: "Race" });
  platform.push({
    slot: "Brakes",
    part: BRAKES[config.brakePackage ?? "stock"] ?? "Leave stock",
  });

  const trans = TRANS[config.transPackage ?? "stock"];
  const needRaceTrans = config.includeGearing || config.transPackage === "race" || config.transPackage === "sequential";
  drivetrain.push({ slot: "Transmission", part: needRaceTrans ? trans ?? "Race" : trans ?? "Leave stock" });
  drivetrain.push({ slot: "Clutch", part: needRaceTrans ? "Race" : "Leave stock" });
  drivetrain.push({ slot: "Differential", part: "Race" });

  const compound =
    config.compound && config.compound !== "Stock"
      ? config.compound
      : TIRES[config.tirePackage ?? "stock"] ?? "Leave stock";
  tires.push({ slot: "Compound", part: compound });
  tires.push({ slot: "Alignment", part: "Race" });
  if (config.tireWF) tires.push({ slot: "Front tire", part: config.tireWF });
  if (config.tireWR) tires.push({ slot: "Rear tire", part: config.tireWR });

  const aeroParts = AERO[config.aeroPackage ?? "none"];
  if (aeroParts) {
    for (const part of aeroParts) {
      const [slot, name] = part.includes("—") ? part.split(" — ") : ["Aero", part];
      aero.push({ slot: slot.trim(), part: (name ?? part).trim() });
    }
  }

  const groups: BuildPartGroup[] = [];
  if (conversions.length) groups.push({ menu: "Conversions", items: conversions });
  groups.push({ menu: "Engine", items: engine });
  groups.push({ menu: "Platform and Handling", items: platform });
  groups.push({ menu: "Drivetrain", items: drivetrain });
  groups.push({ menu: "Tires and Rims", items: tires });
  if (aero.length) groups.push({ menu: "Aero and Appearance", items: aero });

  return {
    hint: "Buy these in Upgrades first. Then enter the sliders.",
    groups,
  };
}

export function buildPartsSummary(config: BuildPartsInput): string {
  const list = buildPartsList(config);
  const buy = list.groups
    .flatMap((g) => g.items)
    .filter((i) => i.part !== "Leave stock")
    .map((i) => `${i.slot} ${i.part}`);
  return buy.slice(0, 4).join(" · ");
}

export function formatBuildPartsText(config: BuildPartsInput): string {
  const list = buildPartsList(config);
  const lines = ["Parts to buy", list.hint];
  for (const group of list.groups) {
    lines.push(`\n${group.menu}`);
    for (const row of group.items) {
      lines.push(`  ${row.slot.padEnd(22)} ${row.part}`);
    }
  }
  return lines.join("\n");
}

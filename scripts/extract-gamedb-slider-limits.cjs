/**
 * Extract per-car spring / ride / aero slider limits from a decrypted Forza GameDB.
 *
 * FH stores GameDB as encrypted SQLite (`media/Stripped/gamedbRC.slt`).
 * Decrypt it first with a community ForzaTech crypto tool, then run:
 *
 *   node scripts/extract-gamedb-slider-limits.cjs --db path/to/gamedb.slt
 *   node scripts/extract-gamedb-slider-limits.cjs --db gamedb.sqlite --out public/carSliderLimits.json
 *
 * The script schema-discovers tables/columns (FH4–FH6 names drift), so it works
 * across titles without hard-coding one schema. Prefer Race-tier spring rows when
 * an upgrade level column is present.
 *
 * See scripts/EXTRACT-GAMEDB.md for decrypt steps.
 */

const fs = require("fs");
const path = require("path");
const { DatabaseSync } = require("node:sqlite");

function parseArgs(argv) {
  const out = {
    db: null,
    out: path.join(__dirname, "..", "public", "carSliderLimits.json"),
    garage: path.join(__dirname, "..", "public", "forzaGarage.json"),
    dumpSchema: false,
    merge: false,
    level: "race", // stock | sport | race | any
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--db") out.db = argv[++i];
    else if (a === "--out") out.out = argv[++i];
    else if (a === "--garage") out.garage = argv[++i];
    else if (a === "--dump-schema") out.dumpSchema = true;
    else if (a === "--merge") out.merge = true;
    else if (a === "--level") out.level = String(argv[++i] || "race").toLowerCase();
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

function scoreColumn(name) {
  const n = name.toLowerCase();
  let s = 0;
  if (/spring/.test(n)) s += 8;
  if (/stiff/.test(n)) s += 4;
  if (/ride|height|rh_/.test(n)) s += 6;
  if (/aero|downforce|df_/.test(n)) s += 6;
  if (/(^|_)min$|minimum|minvalue|min_/.test(n) || /min$/.test(n)) s += 3;
  if (/(^|_)max$|maximum|maxvalue|max_/.test(n) || /max$/.test(n)) s += 3;
  if (/front|fr_|\bf\b/.test(n)) s += 1;
  if (/rear|rr_|\br\b/.test(n)) s += 1;
  if (/susp|chassis|arb|antiroll/.test(n)) s += 2;
  return s;
}

function classifyColumn(name) {
  const n = name.toLowerCase();
  // CamelCase ends with Min/Max (SpringStiffnessFrontMin) — \bmin\b won't match.
  const isMin = /(^|_)min$|minimum|minvalue|_min_/.test(n) || /min$/.test(n);
  const isMax = /(^|_)max$|maximum|maxvalue|_max_/.test(n) || /max$/.test(n);
  const front = /front|fr_|_f$|_f_/.test(n);
  const rear = /rear|rr_|_r$|_r_/.test(n);

  if (/spring|stiff/.test(n) && (isMin || isMax || /rate|stiffness/.test(n))) {
    if (front && isMin) return "springFrontMin";
    if (front && isMax) return "springFrontMax";
    if (rear && isMin) return "springRearMin";
    if (rear && isMax) return "springRearMax";
    // Some DBs use one min/max pair shared F/R — map later.
    if (!front && !rear && isMin) return "springMin";
    if (!front && !rear && isMax) return "springMax";
  }
  if (/ride|height/.test(n)) {
    if (front && isMin) return "rideFrontMin";
    if (front && isMax) return "rideFrontMax";
    if (rear && isMin) return "rideRearMin";
    if (rear && isMax) return "rideRearMax";
    if (!front && !rear && isMin) return "rideMin";
    if (!front && !rear && isMax) return "rideMax";
  }
  if (/aero|downforce/.test(n)) {
    if (front && isMin) return "aeroFrontMin";
    if (front && isMax) return "aeroFrontMax";
    if (rear && isMin) return "aeroRearMin";
    if (rear && isMax) return "aeroRearMax";
    if (front && !isMin && !isMax) return "aeroFrontMax"; // often only max DF
    if (rear && !isMin && !isMax) return "aeroRearMax";
  }
  return null;
}

function tableKind(name) {
  const n = name.toLowerCase();
  if (/data_car\b/.test(n) && !/body|engine|drivetrain/.test(n)) return "car";
  if (/data_carbody|carbody/.test(n)) return "body";
  if (/upgrade.*spring|spring.*upgrade|list_upgrade.*susp|chassis.*spring|springsdamp/.test(n)) {
    return "springs";
  }
  if (/upgrade.*aero|aero.*upgrade|list_upgrade.*aero|downforce/.test(n)) return "aero";
  if (/upgrade.*susp|list_upgrade.*chassis|rideheight/.test(n)) return "suspension";
  return "other";
}

function levelRank(level, prefer) {
  // Common Forza upgrade levels: 0 stock, 1 street/sport, 2 sport/race, 3 race
  const n = Number(level);
  if (!Number.isFinite(n)) return 0;
  if (prefer === "stock") return n === 0 ? 100 : 10 - n;
  if (prefer === "sport") return n === 1 || n === 2 ? 100 - Math.abs(n - 1.5) : 20 - n;
  if (prefer === "any") return 1;
  // race (default): highest level wins
  return n;
}

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function loadGarageIndex(garagePath) {
  if (!fs.existsSync(garagePath)) return { byMedia: new Map(), byOrdinal: new Map() };
  try {
    const data = JSON.parse(fs.readFileSync(garagePath, "utf8"));
    const byMedia = new Map();
    const byOrdinal = new Map();
    for (const car of data.cars || []) {
      if (car.heroCode) byMedia.set(String(car.heroCode).toLowerCase(), car);
      if (car.mediaName) byMedia.set(String(car.mediaName).toLowerCase(), car);
      if (car.slug) byMedia.set(String(car.slug).toLowerCase(), car);
      // ordinal sometimes present after telemetry imports
      if (car.ordinal != null) byOrdinal.set(Number(car.ordinal), car);
    }
    return { byMedia, byOrdinal };
  } catch {
    return { byMedia: new Map(), byOrdinal: new Map() };
  }
}

function slugify(make, model) {
  return `${make}-${model}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.db) {
    console.log(`Usage:
  node scripts/extract-gamedb-slider-limits.cjs --db <decrypted-gamedb.slt> [options]

Options:
  --out <path>       Output JSON (default public/carSliderLimits.json)
  --garage <path>    forzaGarage.json for make/model join (optional)
  --level <tier>     stock | sport | race | any  (default race)
  --merge            Keep existing out file cars; overwrite with measured
  --dump-schema      Print discovered tables/columns and exit
`);
    process.exit(args.help ? 0 : 1);
  }

  if (!fs.existsSync(args.db)) {
    console.error(`DB not found: ${args.db}`);
    console.error("Decrypt media/Stripped/gamedbRC.slt first — see scripts/EXTRACT-GAMEDB.md");
    process.exit(1);
  }

  // Quick magic check — SQLite starts with "SQLite format 3\0"
  const head = Buffer.alloc(16);
  const fd = fs.openSync(args.db, "r");
  fs.readSync(fd, head, 0, 16, 0);
  fs.closeSync(fd);
  if (head.toString("utf8", 0, 15) !== "SQLite format 3") {
    console.error("File does not look like a decrypted SQLite database.");
    console.error("Encrypted gamedbRC.slt must be decrypted before extraction.");
    console.error("See scripts/EXTRACT-GAMEDB.md");
    process.exit(1);
  }

  const db = new DatabaseSync(args.db, { readOnly: true });
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((r) => r.name);

  const schema = [];
  for (const table of tables) {
    const cols = db.prepare(`PRAGMA table_info(${JSON.stringify(table)})`).all();
    const mapped = cols
      .map((c) => ({ name: c.name, role: classifyColumn(c.name), score: scoreColumn(c.name) }))
      .filter((c) => c.score > 0 || c.role);
    schema.push({
      table,
      kind: tableKind(table),
      columns: mapped,
      allColumns: cols.map((c) => c.name),
    });
  }

  if (args.dumpSchema) {
    for (const t of schema.sort((a, b) => a.table.localeCompare(b.table))) {
      const roles = t.columns.filter((c) => c.role);
      if (!roles.length && t.kind === "other") continue;
      console.log(`\n[${t.kind}] ${t.table}`);
      for (const c of t.columns) {
        console.log(`  ${c.name}${c.role ? ` → ${c.role}` : ""} (score ${c.score})`);
      }
    }
    process.exit(0);
  }

  const garage = loadGarageIndex(args.garage);

  // Find identity columns on Data_Car-like tables
  const carTables = schema.filter((t) => t.kind === "car" || /data_car$/i.test(t.table));
  const identityTable =
    carTables.find((t) => t.allColumns.some((c) => /medianame/i.test(c))) ||
    carTables[0] ||
    schema.find((t) => t.allColumns.some((c) => /medianame/i.test(c)));

  if (!identityTable) {
    console.error("Could not find a Data_Car / MediaName table. Try --dump-schema.");
    process.exit(1);
  }

  const idCols = {
    id: identityTable.allColumns.find((c) => /^(id|carid|ordinal)$/i.test(c)),
    media: identityTable.allColumns.find((c) => /medianame/i.test(c)),
    make: identityTable.allColumns.find((c) => /make|manufacturer|brand/i.test(c)),
    model: identityTable.allColumns.find((c) => /model|carname|displayname/i.test(c)),
    year: identityTable.allColumns.find((c) => /year/i.test(c)),
    weight: identityTable.allColumns.find((c) => /weight(?!dist)|mass/i.test(c)),
    weightDist: identityTable.allColumns.find((c) => /weightdist|frontweight|bias/i.test(c)),
    carBodyId: identityTable.allColumns.find((c) => /carbodyid|bodyid/i.test(c)),
  };

  const cars = db.prepare(`SELECT * FROM ${JSON.stringify(identityTable.table)}`).all();
  console.log(`Cars in ${identityTable.table}: ${cars.length}`);

  // Collect candidate rows from spring/aero/suspension tables
  const limitTables = schema.filter(
    (t) =>
      t.kind === "springs" ||
      t.kind === "aero" ||
      t.kind === "suspension" ||
      t.kind === "body" ||
      t.columns.some((c) => c.role),
  );

  /** @type {Map<string, any[]>} */
  const rowsByKey = new Map();

  function addRow(key, payload, score) {
    if (!key) return;
    const list = rowsByKey.get(key) || [];
    list.push({ ...payload, _score: score });
    rowsByKey.set(key, list);
  }

  for (const t of limitTables) {
    const roles = Object.fromEntries(t.columns.filter((c) => c.role).map((c) => [c.role, c.name]));
    if (!Object.keys(roles).length) continue;

    const joinCol =
      t.allColumns.find((c) => /^(carid|ordinal|id)$/i.test(c)) ||
      t.allColumns.find((c) => /carbodyid|bodyid/i.test(c)) ||
      t.allColumns.find((c) => /medianame/i.test(c));
    const levelCol = t.allColumns.find((c) => /level|upgradelevel|tier|rarity/i.test(c));
    const isRaceName = /race|rally|off.?road/i.test(t.table);

    let rows = [];
    try {
      rows = db.prepare(`SELECT * FROM ${JSON.stringify(t.table)}`).all();
    } catch (e) {
      console.warn(`Skip ${t.table}: ${e.message}`);
      continue;
    }

    for (const row of rows) {
      const level = levelCol ? row[levelCol] : isRaceName ? 3 : 0;
      const score = levelRank(level, args.level) + (t.kind === "springs" ? 5 : 0);
      const payload = { _table: t.table, _level: level };
      for (const [role, col] of Object.entries(roles)) {
        payload[role] = num(row[col]);
      }
      // Shared min/max → both axles
      if (payload.springMin != null) {
        payload.springFrontMin ??= payload.springMin;
        payload.springRearMin ??= payload.springMin;
      }
      if (payload.springMax != null) {
        payload.springFrontMax ??= payload.springMax;
        payload.springRearMax ??= payload.springMax;
      }
      if (payload.rideMin != null) {
        payload.rideFrontMin ??= payload.rideMin;
        payload.rideRearMin ??= payload.rideMin;
      }
      if (payload.rideMax != null) {
        payload.rideFrontMax ??= payload.rideMax;
        payload.rideRearMax ??= payload.rideMax;
      }

      const keyVal = joinCol ? row[joinCol] : null;
      if (keyVal == null) continue;
      addRow(String(keyVal).toLowerCase(), payload, score);
      addRow(`id:${keyVal}`, payload, score);
    }
    console.log(`  ${t.table}: ${rows.length} rows, roles=${Object.keys(roles).join(",")}`);
  }

  function mergePayloads(keys) {
    /** Prefer higher-scoring rows per field so spring + aero tables combine. */
    const merged = { _score: -1, _table: null, _level: null };
    const fieldBest = {};
    for (const k of keys) {
      if (k == null || k === "") continue;
      const list = rowsByKey.get(String(k).toLowerCase()) || rowsByKey.get(String(k));
      if (!list) continue;
      for (const p of list) {
        if (p._score > merged._score) {
          merged._score = p._score;
          merged._table = p._table;
          merged._level = p._level;
        }
        for (const [role, val] of Object.entries(p)) {
          if (role.startsWith("_") || val == null) continue;
          const prev = fieldBest[role];
          if (!prev || p._score > prev.score) fieldBest[role] = { score: p._score, val };
        }
      }
    }
    for (const [role, { val }] of Object.entries(fieldBest)) merged[role] = val;
    return Object.keys(fieldBest).length ? merged : null;
  }

  let existing = null;
  if (args.merge && fs.existsSync(args.out)) {
    try {
      existing = JSON.parse(fs.readFileSync(args.out, "utf8"));
    } catch {
      existing = null;
    }
  }

  const out = {
    version: 2,
    generatedAt: new Date().toISOString(),
    source: args.merge
      ? "mixed: GameDB measured + estimated fallback"
      : "extracted from decrypted Forza GameDB",
    dbPath: path.resolve(args.db),
    level: args.level,
    unitSprings: "lbs/in",
    unitAero: "kg",
    unitRide: "cm",
    count: 0,
    cars: existing?.cars && typeof existing.cars === "object" ? { ...existing.cars } : {},
  };

  let matched = 0;
  for (const car of cars) {
    const id = idCols.id ? car[idCols.id] : null;
    const media = idCols.media ? String(car[idCols.media] || "") : "";
    const bodyId = idCols.carBodyId ? car[idCols.carBodyId] : null;

    const garageCar =
      (media && garage.byMedia.get(media.toLowerCase())) ||
      (id != null && garage.byOrdinal.get(Number(id))) ||
      null;

    const make =
      (idCols.make && car[idCols.make]) ||
      garageCar?.make ||
      (media.includes("_") ? media.split("_")[0] : "Unknown");
    const model =
      (idCols.model && car[idCols.model]) ||
      garageCar?.model ||
      media ||
      `Car ${id}`;
    const year = (idCols.year && car[idCols.year]) || garageCar?.year || null;
    const weightLbs =
      num(idCols.weight && car[idCols.weight]) ||
      garageCar?.weightLbs ||
      garageCar?.tuneSpecs?.weightLbs ||
      null;
    const weightDist =
      num(idCols.weightDist && car[idCols.weightDist]) ||
      garageCar?.tuneSpecs?.weightDist ||
      50;

    const payload = mergePayloads([
      id,
      `id:${id}`,
      media,
      bodyId,
      garageCar?.heroCode,
      garageCar?.slug,
    ]);

    // Need at least some spring or aero data
    const hasSpring =
      payload &&
      (payload.springFrontMin != null ||
        payload.springFrontMax != null ||
        payload.springRearMin != null ||
        payload.springRearMax != null);
    const hasAero =
      payload && (payload.aeroFrontMax != null || payload.aeroRearMax != null);
    const hasRide =
      payload && (payload.rideFrontMin != null || payload.rideFrontMax != null);

    if (!hasSpring && !hasAero && !hasRide) continue;

    // GameDB spring values are typically already in the game's display units.
    // FH lists imperial as lbs/in. We store as lbs/in; converter handles metric UI.
    const springs = hasSpring
      ? {
          frontMin: payload.springFrontMin ?? payload.springRearMin ?? 0,
          frontMax: payload.springFrontMax ?? payload.springRearMax ?? 0,
          rearMin: payload.springRearMin ?? payload.springFrontMin ?? 0,
          rearMax: payload.springRearMax ?? payload.springFrontMax ?? 0,
          unit: "lbs/in",
        }
      : null;

    if (springs && !(springs.frontMax > springs.frontMin && springs.rearMax > springs.rearMin)) {
      // Invalid / placeholder — skip springs but keep aero
      if (!hasAero) continue;
    }

    const key = garageCar?.slug || slugify(make, model);
    out.cars[key] = {
      make: String(make),
      model: String(model),
      year: year != null ? String(year) : null,
      mediaName: media || null,
      ordinal: id != null ? Number(id) : null,
      weightLbs: weightLbs != null ? Math.round(weightLbs) : null,
      weightDist: weightDist != null ? Math.round(weightDist) : 50,
      source: "measured",
      springs:
        springs && springs.frontMax > springs.frontMin
          ? {
              frontMin: +springs.frontMin.toFixed(1),
              frontMax: +springs.frontMax.toFixed(1),
              rearMin: +springs.rearMin.toFixed(1),
              rearMax: +springs.rearMax.toFixed(1),
              unit: "lbs/in",
            }
          : undefined,
      ride: hasRide
        ? {
            frontMin: payload.rideFrontMin ?? 15,
            frontMax: payload.rideFrontMax ?? 26,
            rearMin: payload.rideRearMin ?? payload.rideFrontMin ?? 15,
            rearMax: payload.rideRearMax ?? payload.rideFrontMax ?? 26,
          }
        : undefined,
      aero: hasAero
        ? {
            frontMin: payload.aeroFrontMin ?? 0,
            frontMax: payload.aeroFrontMax,
            rearMin: payload.aeroRearMin ?? 0,
            rearMax: payload.aeroRearMax,
            unit: "kg",
          }
        : garageCar?.tuneSpecs?.hasAero
          ? {
              frontMin: 0,
              frontMax: garageCar.tuneSpecs.downforceFront ?? null,
              rearMin: 0,
              rearMax: garageCar.tuneSpecs.downforceRear ?? null,
              unit: "kg",
            }
          : null,
    };
    // strip undefined
    if (!out.cars[key].springs) delete out.cars[key].springs;
    if (!out.cars[key].ride) delete out.cars[key].ride;
    matched++;
  }

  out.count = Object.keys(out.cars).length;
  const measured = Object.values(out.cars).filter((c) => c.source === "measured").length;
  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, JSON.stringify(out, null, 0));
  console.log(
    `\nWrote ${out.count} cars (${matched} extracted this run, ${measured} measured total) → ${args.out}`,
  );
  if (matched === 0) {
    console.log("No spring/aero columns matched. Re-run with --dump-schema and share the roles list.");
    process.exit(2);
  }
}

main();

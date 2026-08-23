/**
 * updates.json must be valid JSON with a version + changelog entries.
 * A broken file blanks the Update sheet (local and GitHub both parse it).
 * Usage: node scripts/check-updates-manifest.cjs
 */
const fs = require("fs");
const path = require("path");

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

const file = path.join(__dirname, "..", "public", "updates.json");
let data;
try {
  data = JSON.parse(fs.readFileSync(file, "utf8"));
} catch (err) {
  fail(`updates.json is not valid JSON: ${err.message}`);
}

if (typeof data.version !== "string" || !data.version) fail("missing top-level version");
if (!Array.isArray(data.entries) || data.entries.length < 1) fail("entries must be a non-empty array");

const versions = new Set();
for (const [i, entry] of data.entries.entries()) {
  if (!entry || typeof entry.version !== "string") fail(`entry ${i} missing version`);
  if (!entry.title) fail(`entry ${entry.version} missing title`);
  if (!Array.isArray(entry.items) || entry.items.length < 1) {
    fail(`entry ${entry.version} needs at least one item`);
  }
  if (versions.has(entry.version)) fail(`duplicate version ${entry.version}`);
  versions.add(entry.version);
}

if (data.entries[0].version !== data.version) {
  fail(`latest entry ${data.entries[0].version} != manifest version ${data.version}`);
}

const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
if (pkg.version !== data.version) fail(`package.json ${pkg.version} != updates.json ${data.version}`);

console.log(`check-updates-manifest: ok (${data.entries.length} entries, latest ${data.version})`);

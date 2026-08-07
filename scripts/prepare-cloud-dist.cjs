/**
 * Copy dist → dist-cloud without full hero photos (use thumbs + CDN on detail).
 * Keeps Cloudflare / Workers deploys small and fast on phones.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "dist");
const DEST = path.join(ROOT, "dist-cloud");

function rm(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyDir(from, to, { skipHeros = false } = {}) {
  fs.mkdirSync(to, { recursive: true });
  for (const name of fs.readdirSync(from)) {
    if (skipHeros && name === "heros") continue;
    const a = path.join(from, name);
    const b = path.join(to, name);
    const st = fs.statSync(a);
    if (st.isDirectory()) copyDir(a, b, { skipHeros: false });
    else fs.copyFileSync(a, b);
  }
}

if (!fs.existsSync(SRC)) {
  console.error("dist/ missing — run npm run build first");
  process.exit(1);
}

rm(DEST);
copyDir(SRC, DEST);
const heros = path.join(DEST, "garage", "heros");
if (fs.existsSync(heros)) rm(heros);

function du(dir) {
  let n = 0;
  if (!fs.existsSync(dir)) return 0;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const st = fs.statSync(p);
    n += st.isDirectory() ? du(p) : st.size;
  }
  return n;
}

const fullMb = (du(SRC) / 1024 / 1024).toFixed(1);
const cloudMb = (du(DEST) / 1024 / 1024).toFixed(1);
console.log(`Prepared ${DEST}`);
console.log(`  full dist:  ${fullMb} MB`);
console.log(`  cloud dist: ${cloudMb} MB (heros stripped — thumbs kept)`);

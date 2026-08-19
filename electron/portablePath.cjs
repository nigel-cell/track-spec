/**
 * Resolve the user-facing TrackSpec-Live.exe (portable SFX), not the unpacked
 * electron.exe that actually runs from a temp folder.
 */
const fs = require("fs");
const path = require("path");

const PORTABLE_NAME = "TrackSpec-Live.exe";

function getPortableExePath(env = process.env, exists = (p) => fs.existsSync(p), execPath = process.execPath) {
  const fromFile = env.PORTABLE_EXECUTABLE_FILE;
  if (fromFile && exists(fromFile)) return fromFile;

  const dir = env.PORTABLE_EXECUTABLE_DIR;
  if (dir) {
    const named = path.join(dir, PORTABLE_NAME);
    if (exists(named)) return named;
  }

  if (typeof execPath === "string" && /TrackSpec-Live\.exe$/i.test(execPath) && exists(execPath)) {
    return execPath;
  }

  return fromFile || null;
}

module.exports = { getPortableExePath, PORTABLE_NAME };

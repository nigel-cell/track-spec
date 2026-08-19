/**
 * Portable exe path + replace-script invariants for the in-app updater.
 * Usage: node scripts/check-desktop-updater.cjs
 */
const path = require("path");
const { getPortableExePath } = require("../electron/portablePath.cjs");

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

const fakeExists = (want) => (p) => p === want;

const portable = "C:\\Games\\TrackSpec-Live.exe";
const found = getPortableExePath({ PORTABLE_EXECUTABLE_FILE: portable }, fakeExists(portable));
if (found !== portable) fail(`PORTABLE_EXECUTABLE_FILE → ${found}`);

const dir = "D:\\Downloads";
const named = path.join(dir, "TrackSpec-Live.exe");
const fromDir = getPortableExePath({ PORTABLE_EXECUTABLE_DIR: dir }, fakeExists(named));
if (fromDir !== named) fail(`PORTABLE_EXECUTABLE_DIR → ${fromDir}`);

const execPath = "E:\\TrackSpec-Live.exe";
const fromExec = getPortableExePath({}, fakeExists(execPath), execPath);
if (fromExec !== execPath) fail(`execPath → ${fromExec}`);

const unpacked = getPortableExePath({}, fakeExists("C:\\Temp\\electron.exe"), "C:\\Temp\\electron.exe");
if (unpacked) fail(`unpacked electron.exe should not be treated as portable, got ${unpacked}`);

console.log("check-desktop-updater: ok");

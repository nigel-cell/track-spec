/**
 * Portable exe path + replace-script invariants for the in-app updater.
 * Usage: node scripts/check-desktop-updater.cjs
 */
const path = require("path");
const { getPortableExePath } = require("../electron/portablePath.cjs");
const { buildReplaceScript } = require("../electron/replaceScript.cjs");

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

const script = buildReplaceScript({
  targetExe: 'C:\\Games\\TrackSpec-Live.exe',
  sourceExe: "C:\\Temp\\TrackSpec-Live-new.exe",
  pid: 4242,
});
if (!script.includes('set "TARGET=C:\\Games\\TrackSpec-Live.exe"')) fail("script missing TARGET");
if (!script.includes('set "SOURCE=C:\\Temp\\TrackSpec-Live-new.exe"')) fail("script missing SOURCE");
if (!script.includes('set "WAITPID=4242"')) fail("script missing WAITPID");
if (!script.includes("tasklist /FI \"PID eq %WAITPID%\"")) fail("script should wait for this exe to exit");
if (!script.includes('copy /Y "%SOURCE%" "%TARGET%"')) fail("script missing copy");
if (!/start "" \/D "%%~dpI" "%TARGET%"/.test(script) && !script.includes('start "" /D "%%~dpI" "%TARGET%"')) {
  fail(`script should relaunch from the exe folder:\n${script}`);
}
if (script.includes("pause\r\nexit /b 0")) fail("success path should not pause");

const injected = buildReplaceScript({
  targetExe: 'C:\\Games\\evil.exe"\r\ncalc\r\n"',
  sourceExe: "noop",
  pid: -3,
});
if (injected.includes("\r\ncalc") || injected.includes('"evil')) fail("paths must strip quotes/newlines");
if (injected.includes('set "WAITPID=-3"')) fail("invalid pid should be empty");

console.log("check-desktop-updater: ok");

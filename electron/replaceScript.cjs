/**
 * Windows helper that waits for this exe to exit, copies the new portable
 * package over it, then starts Track Spec again.
 */
function sanitizePath(value) {
  return String(value ?? "").replace(/[\r\n"]/g, "");
}

function sanitizePid(pid) {
  const n = Number(pid);
  if (!Number.isInteger(n) || n <= 0) return "";
  return String(n);
}

function buildReplaceScript({ targetExe, sourceExe, pid }) {
  const target = sanitizePath(targetExe);
  const source = sanitizePath(sourceExe);
  const waitPid = sanitizePid(pid);
  const lines = [
    "@echo off",
    "setlocal EnableExtensions",
    `set "TARGET=${target}"`,
    `set "SOURCE=${source}"`,
    waitPid ? `set "WAITPID=${waitPid}"` : "set \"WAITPID=\"",
    "echo Installing Track Spec update...",
    "if not defined WAITPID goto copyit",
    "set /a TRIES=0",
    ":waitexit",
    "set /a TRIES+=1",
    "if %TRIES% GTR 60 goto copyit",
    "timeout /t 1 /nobreak >nul",
    'tasklist /FI "PID eq %WAITPID%" /FO CSV /NH 2>nul | find /I ".exe" >nul',
    "if not errorlevel 1 goto waitexit",
    ":copyit",
    "set /a COPYTRIES=0",
    ":retry",
    "set /a COPYTRIES+=1",
    "if %COPYTRIES% GTR 30 goto fail",
    'copy /Y "%SOURCE%" "%TARGET%" >nul',
    "if errorlevel 1 (",
    "  timeout /t 1 /nobreak >nul",
    "  goto retry",
    ")",
    'del "%SOURCE%" >nul 2>&1',
    'for %%I in ("%TARGET%") do start "" /D "%%~dpI" "%TARGET%"',
    'del "%~f0" >nul 2>&1',
    "exit /b 0",
    ":fail",
    "echo Could not replace TrackSpec-Live.exe. Close Track Spec and copy the new file over it.",
    "pause",
    "exit /b 1",
    "",
  ];
  return lines.join("\r\n");
}

module.exports = { buildReplaceScript, sanitizePath };

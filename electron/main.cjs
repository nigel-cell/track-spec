/**
 * Track Spec desktop shell — starts the UDP/WebSocket relay + opens the UI.
 * Double-click the packaged .exe (or `npm run desktop`) for Live tuning.
 */
const { app, BrowserWindow, shell, dialog } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");

/** Prefer these first when starting our own relay (avoids common :3000 clashes / Win excluded ranges). */
const ELECTRON_PORTS = Array.from({ length: 30 }, (_, i) => 39200 + i);
/** Also accept an already-running START.bat / older relay on the classic range. */
const LEGACY_PORTS = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009];
const SCAN_PORTS = [...LEGACY_PORTS, ...ELECTRON_PORTS];

let mainWindow = null;
let relayStartedByUs = false;
let logFilePath = null;

function appendLog(line) {
  const text = `[${new Date().toISOString()}] ${line}\n`;
  try {
    if (logFilePath) fs.appendFileSync(logFilePath, text);
  } catch {
    /* ignore */
  }
  console.error(line);
}

/** Port-in-use must never show Electron's ugly "Uncaught Exception" dialog. */
process.on("uncaughtException", (err) => {
  if (err && (err.code === "EADDRINUSE" || err.code === "EACCES" || /EADDRINUSE|EACCES/.test(String(err && err.message)))) {
    appendLog(`Port unavailable — continuing (${err.code || err.message})`);
    return;
  }
  appendLog(`Uncaught exception: ${err && err.stack ? err.stack : err}`);
  try {
    dialog.showErrorBox("Track Spec error", String(err && err.stack ? err.stack : err));
  } catch {
    /* ignore */
  }
});

process.on("unhandledRejection", (reason) => {
  const msg = reason && reason.message ? reason.message : String(reason);
  if (/EADDRINUSE|EACCES/.test(msg)) {
    appendLog(`Port unavailable (promise) — continuing.`);
    return;
  }
  appendLog(`Unhandled rejection: ${msg}`);
});

function resolvePaths() {
  const packaged = app.isPackaged;
  const root = packaged
    ? path.join(process.resourcesPath, "app.asar")
    : path.join(__dirname, "..");
  // asarUnpack puts dist on disk; prefer the real folder when packaged.
  const distUnpacked = packaged
    ? path.join(process.resourcesPath, "app.asar.unpacked", "dist")
    : null;
  const dist =
    distUnpacked && fs.existsSync(path.join(distUnpacked, "index.html"))
      ? distUnpacked
      : path.join(root, "dist");
  const dataDir = path.join(app.getPath("userData"), "data");
  // Keep server.js inside asar so node_modules (express/ws) resolve correctly.
  const serverJs = packaged
    ? path.join(process.resourcesPath, "app.asar", "server.js")
    : path.join(__dirname, "..", "server.js");
  return { root, dist, dataDir, serverJs, packaged };
}

function pingRelay(port, timeoutMs = 500) {
  return new Promise((resolve) => {
    const req = http.get(`http://127.0.0.1:${port}/ping`, { timeout: timeoutMs }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => {
        body += chunk;
      });
      res.on("end", () => {
        const ok = res.statusCode === 200 && /Track Spec/i.test(body);
        resolve(ok);
      });
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function findHealthyRelayPort(ports = SCAN_PORTS) {
  // Parallel scan — much faster than serial timeouts on Windows.
  const results = await Promise.all(ports.map(async (port) => ((await pingRelay(port)) ? port : null)));
  return results.find((port) => port != null) ?? null;
}

async function waitForBoundPort(attempts = 60, delayMs = 100) {
  for (let i = 0; i < attempts; i++) {
    const bound = Number(process.env.TRACK_SPEC_BOUND_HTTP_PORT);
    if (bound > 0) {
      if (await pingRelay(bound, 400)) return bound;
    }
    const scanned = await findHealthyRelayPort(SCAN_PORTS);
    if (scanned != null) return scanned;
    if (process.env.TRACK_SPEC_HTTP_BIND_ERROR) {
      // Bind fully failed — no point waiting the full timeout.
      return null;
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

function startRelayIfNeeded(paths, existingPort) {
  if (existingPort != null) {
    appendLog(`Reusing healthy relay on port ${existingPort}`);
    return { ok: true };
  }
  process.env.TRACK_SPEC_ELECTRON = "1";
  process.env.TRACK_SPEC_DIST = paths.dist;
  process.env.TRACK_SPEC_DATA_DIR = paths.dataDir;
  // Prefer high ports for the desktop shell; still scan legacy 3000 for reuse above.
  process.env.TRACK_SPEC_HTTP_PORT = String(ELECTRON_PORTS[0]);
  process.env.TRACK_SPEC_HTTP_PORT_TRIES = String(ELECTRON_PORTS.length);
  try {
    fs.mkdirSync(paths.dataDir, { recursive: true });
  } catch (err) {
    appendLog(`Could not create data dir: ${err && err.message ? err.message : err}`);
  }
  try {
    appendLog(`Starting relay from ${paths.serverJs}`);
    appendLog(`DIST=${paths.dist}`);
    require(paths.serverJs);
    relayStartedByUs = true;
    return { ok: true };
  } catch (err) {
    const msg = String(err && err.stack ? err.stack : err);
    appendLog(`Failed to start relay: ${msg}`);
    return { ok: false, error: msg };
  }
}

function createWindow() {
  const { dist } = resolvePaths();
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "Track Spec",
    backgroundColor: "#0a0a0a",
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(dist, "icon-512.png"),
  });

  mainWindow.webContents.on("did-fail-load", (_e, errorCode, errorDescription, validatedURL) => {
    dialog.showErrorBox(
      "Track Spec failed to load",
      `Could not open the UI (${errorCode}: ${errorDescription}).\n\nURL: ${validatedURL}`,
    );
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function loadUi(port) {
  if (!mainWindow) createWindow();
  if (port != null) {
    const uiUrl = `http://127.0.0.1:${port}/`;
    appendLog(`Loading UI ${uiUrl}`);
    try {
      await mainWindow.loadURL(uiUrl);
      return;
    } catch (err) {
      appendLog(`loadURL failed: ${err}`);
    }
  }
  // Offline / relay-down fallback so Tune + Garage still work.
  const { dist } = resolvePaths();
  const indexHtml = path.join(dist, "index.html");
  appendLog(`Falling back to file UI: ${indexHtml}`);
  try {
    await mainWindow.loadFile(indexHtml);
  } catch (err) {
    dialog.showErrorBox("Track Spec failed to load", String(err));
  }
}

async function bootUi() {
  const paths = resolvePaths();
  try {
    fs.mkdirSync(app.getPath("userData"), { recursive: true });
  } catch {
    /* ignore */
  }
  logFilePath = path.join(app.getPath("userData"), "relay.log");
  appendLog(`Track Spec desktop boot (packaged=${paths.packaged})`);
  appendLog(`userData=${app.getPath("userData")}`);

  const existing = await findHealthyRelayPort(SCAN_PORTS);
  const started = startRelayIfNeeded(paths, existing);
  if (!started.ok) {
    dialog.showErrorBox(
      "Track Spec relay failed to start",
      `${started.error}\n\nLog: ${logFilePath}`,
    );
    await loadUi(null);
    return;
  }

  const port = existing != null ? existing : await waitForBoundPort();
  if (port == null) {
    const bindErr = process.env.TRACK_SPEC_HTTP_BIND_ERROR || "No local Track Spec server responded.";
    appendLog(`Relay wait failed: ${bindErr}`);
    dialog.showErrorBox(
      "Track Spec relay did not start",
      `${bindErr}\n\n` +
        "1. Close other Track Spec windows / START.bat\n" +
        "2. In PowerShell:\n" +
        "   netstat -ano | findstr \":3000 :39200\"\n" +
        "3. End leftover PIDs, then reopen this exe\n\n" +
        `Log file:\n${logFilePath}\n\n` +
        "Opening the app offline (Live telemetry unavailable until the relay starts).",
    );
    await loadUi(null);
    return;
  }

  if (relayStartedByUs) {
    appendLog(`Relay ready on port ${port}`);
  }
  await loadUi(port);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    void bootUi();
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}

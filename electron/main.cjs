/**
 * Track Spec desktop shell — starts the UDP/WebSocket relay + opens the UI.
 * Double-click the packaged .exe (or `npm run desktop`) for Live tuning.
 */
const { app, BrowserWindow, shell, dialog, ipcMain } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");
const updater = require("./updater.cjs");

/** Prefer these first when starting our own relay (avoids common :3000 clashes / Win excluded ranges). */
const ELECTRON_PORTS = Array.from({ length: 30 }, (_, i) => 39200 + i);
/** Also accept an already-running START.bat / older relay on the classic range. */
const LEGACY_PORTS = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009];
const SCAN_PORTS = [...LEGACY_PORTS, ...ELECTRON_PORTS];

let mainWindow = null;
let relayStartedByUs = false;
let relayModule = null;
let logFilePath = null;
let isShuttingDown = false;

function appendLog(line) {
  const text = `[${new Date().toISOString()}] ${line}\n`;
  try {
    if (logFilePath) fs.appendFileSync(logFilePath, text);
  } catch {
    /* ignore */
  }
  console.error(line);
}

function readLogTail(maxLines = 35) {
  try {
    if (!logFilePath || !fs.existsSync(logFilePath)) return "(no log yet)";
    const lines = fs.readFileSync(logFilePath, "utf8").trim().split(/\r?\n/);
    return lines.slice(-maxLines).join("\n");
  } catch (err) {
    return `(could not read log: ${err && err.message ? err.message : err})`;
  }
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
  const distUnpacked = packaged
    ? path.join(process.resourcesPath, "app.asar.unpacked", "dist")
    : null;
  const dist =
    distUnpacked && fs.existsSync(path.join(distUnpacked, "index.html"))
      ? distUnpacked
      : path.join(root, "dist");
  const dataDir = path.join(app.getPath("userData"), "data");
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
        resolve(res.statusCode === 200 && /Track Spec/i.test(body));
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
  const results = await Promise.all(ports.map(async (port) => ((await pingRelay(port)) ? port : null)));
  return results.find((port) => port != null) ?? null;
}

function startRelayIfNeeded(paths, existingPort) {
  if (existingPort != null) {
    appendLog(`Reusing healthy relay on port ${existingPort}`);
    return { ok: true };
  }
  process.env.TRACK_SPEC_ELECTRON = "1";
  process.env.TRACK_SPEC_DIST = paths.dist;
  process.env.TRACK_SPEC_DATA_DIR = paths.dataDir;
  process.env.TRACK_SPEC_HTTP_HOST = "127.0.0.1";
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
    appendLog(`exists(server)=${fs.existsSync(paths.serverJs)} exists(dist)=${fs.existsSync(paths.dist)}`);
    relayModule = require(paths.serverJs);
    relayStartedByUs = true;
    return { ok: true };
  } catch (err) {
    const msg = String(err && err.stack ? err.stack : err);
    appendLog(`Failed to start relay: ${msg}`);
    return { ok: false, error: msg };
  }
}

async function waitForOurRelay(timeoutMs = 15000) {
  if (!relayModule || typeof relayModule.whenReady !== "function") {
    // Older server.js fallback
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const bound = Number(process.env.TRACK_SPEC_BOUND_HTTP_PORT);
      if (bound > 0) return bound;
      if (process.env.TRACK_SPEC_HTTP_BIND_ERROR) {
        throw new Error(process.env.TRACK_SPEC_HTTP_BIND_ERROR);
      }
      await new Promise((r) => setTimeout(r, 100));
    }
    throw new Error("Timed out waiting for relay to bind a port");
  }

  let timer;
  try {
    const port = await Promise.race([
      relayModule.whenReady(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          reject(new Error("Timed out waiting for relay to bind a port"));
        }, timeoutMs);
      }),
    ]);
    return port;
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/** Close sockets/timers, then force-exit — Windows otherwise leaves the exe running in Task Manager. */
function hardQuit(reason = "quit") {
  if (isShuttingDown) return;
  isShuttingDown = true;
  appendLog(`Shutting down (${reason})`);
  try {
    if (relayStartedByUs && relayModule && typeof relayModule.shutdownRelay === "function") {
      relayModule.shutdownRelay();
    }
  } catch (err) {
    appendLog(`Relay shutdown error: ${err && err.message ? err.message : err}`);
  }
  try {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
    }
  } catch {
    /* ignore */
  }
  setTimeout(() => app.exit(0), 50);
  app.exit(0);
}

function registerDesktopIpc() {
  ipcMain.handle("desktop:getInfo", () => updater.getInfo());

  ipcMain.handle("desktop:downloadUpdate", async (event, url) => {
    appendLog(`Update download requested: ${url}`);
    const wc = event.sender;
    try {
      const result = await updater.downloadUpdate(url, (progress) => {
        try {
          if (!wc.isDestroyed()) wc.send("desktop:updateProgress", progress);
        } catch {
          /* ignore */
        }
      });
      appendLog(`Update downloaded (${result.bytes} bytes) → ${result.path}`);
      return { ok: true, ...result };
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      appendLog(`Update download failed: ${msg}`);
      return { ok: false, error: msg };
    }
  });

  ipcMain.handle("desktop:cancelUpdate", () => {
    appendLog("Update download cancelled");
    return updater.cancelUpdate();
  });

  ipcMain.handle("desktop:installUpdate", () => {
    try {
      const result = updater.installUpdate();
      appendLog(`Update install: ${JSON.stringify(result)}`);
      if (result.mode === "replace-portable") {
        // Give the helper script a moment to spawn, then quit hard.
        setTimeout(() => hardQuit("install-update"), 300);
      }
      return result;
    } catch (err) {
      const msg = err && err.message ? err.message : String(err);
      appendLog(`Update install failed: ${msg}`);
      return { ok: false, error: msg };
    }
  });
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
      preload: path.join(__dirname, "preload.cjs"),
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
      return true;
    } catch (err) {
      appendLog(`loadURL failed: ${err}`);
    }
  }
  const { dist } = resolvePaths();
  const indexHtml = path.join(dist, "index.html");
  appendLog(`Falling back to file UI: ${indexHtml}`);
  try {
    await mainWindow.loadFile(indexHtml);
    return false;
  } catch (err) {
    dialog.showErrorBox("Track Spec failed to load", String(err));
    return false;
  }
}

function showRelayFailure(detail) {
  appendLog(`Relay wait failed: ${detail}`);
  const tail = readLogTail();
  dialog.showErrorBox(
    "Track Spec relay did not start",
    `${detail}\n\n` +
      "1. Close other Track Spec windows / START.bat\n" +
      "2. In PowerShell: taskkill /F /IM TrackSpec-Live.exe\n" +
      "3. Reopen this exe\n\n" +
      `Log file:\n${logFilePath}\n\n` +
      `--- log ---\n${tail}\n\n` +
      "Opening the app offline (Live telemetry unavailable until the relay starts).",
  );
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
  appendLog(`portableExe=${updater.getPortableExePath() || "(not portable)"}`);
  appendLog(`resourcesPath=${process.resourcesPath || "(none)"}`);

  const existing = await findHealthyRelayPort(SCAN_PORTS);
  const started = startRelayIfNeeded(paths, existing);
  if (!started.ok) {
    showRelayFailure(started.error);
    await loadUi(null);
    return;
  }

  let port = existing;
  if (port == null) {
    try {
      port = await waitForOurRelay(15000);
      appendLog(`whenReady → port ${port}`);
      // Prefer the bound port even if /ping is slow; still try a quick ping for confidence.
      const pingOk = await pingRelay(port, 800);
      appendLog(`ping :${port} → ${pingOk}`);
    } catch (err) {
      const bound = relayModule && typeof relayModule.getBoundPort === "function"
        ? relayModule.getBoundPort()
        : Number(process.env.TRACK_SPEC_BOUND_HTTP_PORT) || null;
      if (bound) {
        appendLog(`Ready wait failed but bound=${bound}; loading UI anyway`);
        port = bound;
      } else {
        showRelayFailure(err && err.message ? err.message : String(err));
        await loadUi(null);
        return;
      }
    }
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
    registerDesktopIpc();
    void bootUi();
  });

  app.on("window-all-closed", () => {
    hardQuit("window-all-closed");
  });

  app.on("before-quit", () => {
    hardQuit("before-quit");
  });
}

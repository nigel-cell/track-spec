/**
 * Track Spec desktop shell — starts the UDP/WebSocket relay + opens the UI.
 * Double-click the packaged .exe (or `npm run desktop`) for Live tuning.
 */
const { app, BrowserWindow, shell, dialog } = require("electron");
const http = require("http");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const RELAY_PORTS = [3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009];

process.env.TRACK_SPEC_ELECTRON = "1";
process.env.TRACK_SPEC_DIST = DIST;

let mainWindow = null;
let relayStartedByUs = false;

/** Port-in-use must never show Electron's ugly "Uncaught Exception" dialog. */
process.on("uncaughtException", (err) => {
  if (err && (err.code === "EADDRINUSE" || /EADDRINUSE/.test(String(err && err.message)))) {
    console.error("[Track Spec] Port already in use — will reuse an existing relay if it responds.");
    return;
  }
  console.error("[Track Spec] Uncaught exception:", err);
  try {
    dialog.showErrorBox("Track Spec error", String(err && err.stack ? err.stack : err));
  } catch {
    /* ignore */
  }
});

process.on("unhandledRejection", (reason) => {
  const msg = reason && reason.message ? reason.message : String(reason);
  if (/EADDRINUSE/.test(msg)) {
    console.error("[Track Spec] Port already in use (promise) — continuing.");
    return;
  }
  console.error("[Track Spec] Unhandled rejection:", reason);
});

function pingRelay(port, timeoutMs = 800) {
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

async function findHealthyRelayPort() {
  for (const port of RELAY_PORTS) {
    if (await pingRelay(port)) return port;
  }
  return null;
}

async function waitForRelay(attempts = 40, delayMs = 250) {
  for (let i = 0; i < attempts; i++) {
    const port = await findHealthyRelayPort();
    if (port != null) return port;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return null;
}

function startRelayIfNeeded(existingPort) {
  if (existingPort != null) {
    console.log(`[Track Spec] Reusing healthy relay on port ${existingPort}`);
    return;
  }
  process.env.TRACK_SPEC_HTTP_PORT = String(RELAY_PORTS[0]);
  process.env.TRACK_SPEC_HTTP_PORT_TRIES = String(RELAY_PORTS.length);
  require(path.join(ROOT, "server.js"));
  relayStartedByUs = true;
}

function createWindow(port) {
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
    // Packaged builds include icons under dist/ (public/ is not copied into the exe).
    icon: path.join(DIST, "icon-512.png"),
  });

  const uiUrl = `http://127.0.0.1:${port}/`;

  mainWindow.webContents.on("did-fail-load", (_e, errorCode, errorDescription, validatedURL) => {
    dialog.showErrorBox(
      "Track Spec failed to load",
      `Could not open the UI (${errorCode}: ${errorDescription}).\n\nURL: ${validatedURL}\n\nClose other Track Spec / START.bat windows, free port ${port}, then reopen the exe.`,
    );
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  void (async () => {
    try {
      await mainWindow.loadURL(uiUrl);
    } catch (err) {
      dialog.showErrorBox("Track Spec failed to load", String(err));
    }
  })();

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

async function bootUi() {
  const existing = await findHealthyRelayPort();
  startRelayIfNeeded(existing);

  const port = existing != null ? existing : await waitForRelay();
  if (port == null) {
    dialog.showErrorBox(
      "Track Spec relay did not start",
      "No local Track Spec server responded on ports 3000–3009.\n\n" +
        "1. Close any other Track Spec window or START.bat\n" +
        "2. In PowerShell: netstat -ano | findstr :3000\n" +
        "3. End the leftover process, then reopen this exe\n\n" +
        "Or run START.bat and open http://127.0.0.1:3000 in your browser.",
    );
    // Still try default — better than a blank forever window.
    createWindow(3000);
    return;
  }

  if (relayStartedByUs && port !== RELAY_PORTS[0]) {
    console.log(`[Track Spec] Relay bound on alternate port ${port}`);
  }

  createWindow(port);
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

/**
 * Track Spec desktop shell — starts the UDP/WebSocket relay + opens the UI.
 * Double-click the packaged .exe (or `npm run desktop`) for Live tuning.
 */
const { app, BrowserWindow, shell, dialog } = require("electron");
const http = require("http");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");

process.env.TRACK_SPEC_ELECTRON = "1";
process.env.TRACK_SPEC_DIST = DIST;

// Start Express + Forza UDP relay (same as START.bat / node server.js)
require(path.join(ROOT, "server.js"));

let mainWindow = null;

function pingRelay(timeoutMs = 800) {
  return new Promise((resolve) => {
    const req = http.get("http://127.0.0.1:3000/ping", { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

async function waitForRelay(attempts = 40, delayMs = 250) {
  for (let i = 0; i < attempts; i++) {
    if (await pingRelay()) return true;
    await new Promise((r) => setTimeout(r, delayMs));
  }
  return false;
}

function createWindow() {
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

  // Prefer "/" — Vite base "./" is reliable here; SiteRoot treats Electron as the app UI.
  // Avoid "/app" which can break relative asset URLs depending on the path.
  const uiUrl = "http://127.0.0.1:3000/";

  mainWindow.webContents.on("did-fail-load", (_e, errorCode, errorDescription, validatedURL) => {
    dialog.showErrorBox(
      "Track Spec failed to load",
      `Could not open the UI (${errorCode}: ${errorDescription}).\n\nURL: ${validatedURL}\n\nTry closing other Track Spec / START.bat windows, then reopen the exe.`,
    );
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  void (async () => {
    const ready = await waitForRelay();
    if (!ready) {
      dialog.showErrorBox(
        "Track Spec relay did not start",
        "The local server on port 3000 never responded.\n\nClose any other Track Spec window or START.bat, then try again.\nIf it keeps failing, run START.bat and open http://127.0.0.1:3000 in your browser.",
      );
    }
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
    createWindow();
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}

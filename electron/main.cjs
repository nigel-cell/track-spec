/**
 * Track Spec desktop shell — starts the UDP/WebSocket relay + opens the UI.
 * Double-click the packaged .exe (or `npm run desktop`) for Live tuning.
 */
const { app, BrowserWindow, shell } = require("electron");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");

process.env.TRACK_SPEC_ELECTRON = "1";
process.env.TRACK_SPEC_DIST = DIST;

// Start Express + Forza UDP relay (same as START.bat / node server.js)
require(path.join(ROOT, "server.js"));

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    title: "Track Spec",
    backgroundColor: "#0a0a0a",
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    icon: path.join(ROOT, "public", "icon-512.png"),
  });

  mainWindow.loadURL("http://127.0.0.1:3000/app");

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
    // Give the relay a moment to bind ports
    setTimeout(createWindow, 500);
  });

  app.on("window-all-closed", () => {
    app.quit();
  });
}

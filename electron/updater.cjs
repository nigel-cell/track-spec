/**
 * In-app updater for the Windows portable exe.
 * Downloads a new TrackSpec-Live.exe and replaces the portable package on restart.
 */
const { app } = require("electron");
const fs = require("fs");
const http = require("http");
const https = require("https");
const path = require("path");
const { spawn } = require("child_process");
const { getPortableExePath } = require("./portablePath.cjs");

let activeReq = null;
let downloadedPath = null;

function getInfo() {
  const portablePath = getPortableExePath();
  return {
    isDesktop: true,
    isPackaged: app.isPackaged,
    isPortable: !!portablePath,
    portablePath,
    version: app.getVersion(),
    userData: app.getPath("userData"),
  };
}

function downloadFile(url, dest, onProgress, redirectCount = 0) {
  return new Promise((resolve, reject) => {
    if (redirectCount > 12) {
      reject(new Error("Too many redirects while downloading update"));
      return;
    }
    const mod = url.startsWith("https:") ? https : http;
    const req = mod.get(
      url,
      {
        headers: {
          "User-Agent": "TrackSpec-Desktop-Updater",
          Accept: "application/octet-stream, */*",
        },
      },
      (res) => {
        const status = res.statusCode || 0;
        if ([301, 302, 303, 307, 308].includes(status) && res.headers.location) {
          const next = new URL(res.headers.location, url).href;
          res.resume();
          resolve(downloadFile(next, dest, onProgress, redirectCount + 1));
          return;
        }
        if (status !== 200) {
          res.resume();
          reject(new Error(`Download failed (HTTP ${status})`));
          return;
        }

        const total = Number(res.headers["content-length"] || 0);
        let received = 0;
        const out = fs.createWriteStream(dest);
        activeReq = req;

        res.on("data", (chunk) => {
          received += chunk.length;
          if (typeof onProgress === "function") {
            onProgress({
              received,
              total,
              percent: total > 0 ? Math.min(100, Math.round((received / total) * 100)) : 0,
            });
          }
        });

        res.pipe(out);
        out.on("finish", () => {
          out.close(() => {
            activeReq = null;
            resolve(dest);
          });
        });
        out.on("error", (err) => {
          activeReq = null;
          try {
            fs.unlinkSync(dest);
          } catch {
            /* ignore */
          }
          reject(err);
        });
        res.on("error", (err) => {
          activeReq = null;
          reject(err);
        });
      },
    );

    activeReq = req;
    req.on("error", (err) => {
      activeReq = null;
      reject(err);
    });
  });
}

async function downloadUpdate(url, onProgress) {
  if (!url || typeof url !== "string") {
    throw new Error("Missing download URL");
  }
  const dir = path.join(app.getPath("temp"), "track-spec-updates");
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, `TrackSpec-Live-${Date.now()}.exe`);
  if (downloadedPath && fs.existsSync(downloadedPath)) {
    try {
      fs.unlinkSync(downloadedPath);
    } catch {
      /* ignore */
    }
  }
  downloadedPath = null;
  await downloadFile(url, dest, onProgress);
  const stat = fs.statSync(dest);
  if (!stat.size || stat.size < 1_000_000) {
    try {
      fs.unlinkSync(dest);
    } catch {
      /* ignore */
    }
    throw new Error("Downloaded file looks too small — update aborted");
  }
  downloadedPath = dest;
  return { path: dest, bytes: stat.size };
}

function cancelUpdate() {
  if (activeReq) {
    try {
      activeReq.destroy();
    } catch {
      /* ignore */
    }
    activeReq = null;
  }
  if (downloadedPath && fs.existsSync(downloadedPath)) {
    try {
      fs.unlinkSync(downloadedPath);
    } catch {
      /* ignore */
    }
  }
  downloadedPath = null;
  return { ok: true };
}

function writeReplaceScript(targetExe, sourceExe) {
  const scriptPath = path.join(app.getPath("temp"), `track-spec-apply-update-${Date.now()}.cmd`);
  // Wait for this process to exit, then replace the portable exe and relaunch.
  const content = [
    "@echo off",
    "setlocal",
    `set "TARGET=${targetExe.replace(/"/g, "")}"`,
    `set "SOURCE=${sourceExe.replace(/"/g, "")}"`,
    "echo Applying Track Spec update...",
    "timeout /t 2 /nobreak >nul",
    ":retry",
    'copy /Y "%SOURCE%" "%TARGET%" >nul',
    "if errorlevel 1 (",
    "  timeout /t 1 /nobreak >nul",
    "  goto retry",
    ")",
    'del "%SOURCE%" >nul 2>&1',
    'start "" "%TARGET%"',
    'del "%~f0" >nul 2>&1',
    "",
  ].join("\r\n");
  fs.writeFileSync(scriptPath, content, "utf8");
  return scriptPath;
}

function installUpdate() {
  if (!downloadedPath || !fs.existsSync(downloadedPath)) {
    throw new Error("No update downloaded yet");
  }

  const portablePath = getPortableExePath();
  if (portablePath && fs.existsSync(path.dirname(portablePath))) {
    const script = writeReplaceScript(portablePath, downloadedPath);
    // Detached cmd so it outlives Electron.
    const child = spawn("cmd.exe", ["/c", script], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
    });
    child.unref();
    return { ok: true, mode: "replace-portable", target: portablePath };
  }

  // Dev / non-portable: open the downloaded file's folder and let the user run it.
  const { shell } = require("electron");
  shell.showItemInFolder(downloadedPath);
  return { ok: true, mode: "manual", path: downloadedPath };
}

module.exports = {
  getInfo,
  getPortableExePath,
  downloadUpdate,
  cancelUpdate,
  installUpdate,
  getDownloadedPath: () => downloadedPath,
};

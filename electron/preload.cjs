const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("trackSpecDesktop", {
  isDesktop: true,
  getInfo: () => ipcRenderer.invoke("desktop:getInfo"),
  downloadUpdate: (url) => ipcRenderer.invoke("desktop:downloadUpdate", url),
  installUpdate: () => ipcRenderer.invoke("desktop:installUpdate"),
  cancelUpdate: () => ipcRenderer.invoke("desktop:cancelUpdate"),
  onUpdateProgress: (handler) => {
    const listener = (_event, payload) => handler(payload);
    ipcRenderer.on("desktop:updateProgress", listener);
    return () => ipcRenderer.removeListener("desktop:updateProgress", listener);
  },
});

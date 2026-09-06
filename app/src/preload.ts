import { contextBridge, ipcRenderer } from "electron";

// window.tool(name, args) → runs the named tool in main.ts
contextBridge.exposeInMainWorld(
  "tool",
  (name: string, args?: Record<string, string>) =>
    ipcRenderer.invoke("tool", name, args),
);

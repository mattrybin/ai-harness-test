import { contextBridge, ipcRenderer } from "electron";

// The page's window API. "tool" is answered in main.ts, the rest in brain.ts.
contextBridge.exposeInMainWorld(
  "tool",
  (name: string, args?: Record<string, string>) =>
    ipcRenderer.invoke("tool", name, args),
);

contextBridge.exposeInMainWorld("say", (text: string) =>
  ipcRenderer.invoke("say", text),
);

contextBridge.exposeInMainWorld("resetBrain", () =>
  ipcRenderer.invoke("reset"),
);

contextBridge.exposeInMainWorld(
  "onBrain",
  (cb: (event: Record<string, unknown>) => void) =>
    ipcRenderer.on("brain", (_e, event) => cb(event)),
);

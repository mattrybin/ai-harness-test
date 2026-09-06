import { contextBridge, ipcRenderer } from "electron";

// window.tool(name, args) → runs the named tool in main.ts
contextBridge.exposeInMainWorld(
  "tool",
  (name: string, args?: Record<string, string>) =>
    ipcRenderer.invoke("tool", name, args),
);

// window.say(text) → one user turn to the brain in brain.ts
contextBridge.exposeInMainWorld("say", (text: string) =>
  ipcRenderer.invoke("say", text),
);

// window.resetBrain() → kill the brain and wipe notes/
contextBridge.exposeInMainWorld("resetBrain", () =>
  ipcRenderer.invoke("reset"),
);

// window.onBrain(cb) → cb gets every event the brain prints
contextBridge.exposeInMainWorld(
  "onBrain",
  (cb: (event: Record<string, unknown>) => void) =>
    ipcRenderer.on("brain", (_e, event) => cb(event)),
);

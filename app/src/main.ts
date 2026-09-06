import { app, BrowserWindow, ipcMain, nativeTheme } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";
import { registerBrain } from "./modules/brain.js";
import { makeTools } from "./modules/tools.js";

// answers window.tool(name, args) from preload.ts. Everything lives in
// <repo>/notes/; returns that directory.
function registerTools(): string {
  const notes = path.join(app.getAppPath(), "..", "notes");
  fs.mkdirSync(notes, { recursive: true });
  const tools = makeTools(notes);
  ipcMain.handle(
    "tool",
    (_e, name: string, args: Record<string, string> = {}) => {
      const run = tools[name];
      if (!run) throw new Error(`no tool named ${name}`);
      return run(args);
    },
  );
  return notes;
}

function createWindow(): BrowserWindow {
  nativeTheme.themeSource = "dark";
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    backgroundColor: "#171717",
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  win.loadFile("src/index.html");
  return win;
}

app.whenReady().then(() => {
  const notes = registerTools();
  registerBrain(createWindow(), notes);
});

app.on("window-all-closed", () => {
  app.quit();
});

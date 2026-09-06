import { app, BrowserWindow, nativeTheme } from "electron";
import * as path from "node:path";
import { registerBrain } from "./modules/brain.js";
import { registerTools } from "./modules/tools.js";

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

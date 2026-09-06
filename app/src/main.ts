import { app, BrowserWindow, nativeTheme } from "electron";
import * as path from "node:path";
import { registerTools } from "./modules/tools.js";

function createWindow(): void {
  nativeTheme.themeSource = "dark";
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    backgroundColor: "#171717",
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  win.loadFile("src/index.html");
}

app.whenReady().then(() => {
  registerTools();
  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});

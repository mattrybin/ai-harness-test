import { app, BrowserWindow } from "electron";

function createWindow(): void {
  const win = new BrowserWindow({ width: 800, height: 600 });
  win.loadFile("src/index.html");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

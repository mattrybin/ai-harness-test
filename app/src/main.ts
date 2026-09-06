import { app, BrowserWindow, nativeTheme } from "electron";

function createWindow(): void {
  nativeTheme.themeSource = "dark";
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    backgroundColor: "#171717",
  });
  win.loadFile("src/index.html");
}

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  app.quit();
});

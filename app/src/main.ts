import { app, BrowserWindow, ipcMain, nativeTheme } from "electron";
import * as fs from "node:fs";
import * as path from "node:path";

// PROTOTYPE: the note tools. Later the AI calls these; today a fake brain in
// renderer.ts does. Everything lives in <repo>/notes/.
const NOTES = path.join(app.getAppPath(), "..", "notes");
const file = (name: string) => path.join(NOTES, name);
const mdFiles = () => fs.readdirSync(NOTES).filter((n) => n.endsWith(".md"));

type Args = Record<string, string>;
const tools: Record<string, (args: Args) => unknown> = {
  create: ({ name }) => {
    fs.writeFileSync(file(name), "", { flag: "wx" });
    return `created ${name}`;
  },
  edit: ({ name, text }) => {
    fs.appendFileSync(file(name), text + "\n");
    return `${name} is now:\n${fs.readFileSync(file(name), "utf8")}`;
  },
  delete: ({ name }) => {
    fs.unlinkSync(file(name));
    return `deleted ${name}`;
  },
  list: () =>
    mdFiles().map((name) => ({ name, size: fs.statSync(file(name)).size })),
  grep: ({ query }) => {
    const hits: string[] = [];
    for (const name of mdFiles()) {
      fs.readFileSync(file(name), "utf8")
        .split("\n")
        .forEach((line, i) => {
          if (line.toLowerCase().includes(query.toLowerCase()))
            hits.push(`${name}:${i + 1}: ${line}`);
        });
    }
    return hits;
  },
};

ipcMain.handle("tool", (_e, name: string, args: Args = {}) => {
  const run = tools[name];
  if (!run) throw new Error(`no tool named ${name}`);
  return run(args);
});

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
  fs.mkdirSync(NOTES, { recursive: true });
  createWindow();
});

app.on("window-all-closed", () => {
  app.quit();
});

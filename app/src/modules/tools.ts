import { app, ipcMain } from "electron";
import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

// The note tools. Later the AI calls these; today the fake brain in
// renderer.ts does.
type Args = Record<string, string>;
type Tools = Record<string, (args: Args) => unknown>;

// The six tools over one flat directory of .md files.
export function makeTools(dir: string): Tools {
  const file = (name: string) => path.join(dir, name);
  const mdFiles = () => fs.readdirSync(dir).filter((n) => n.endsWith(".md"));
  // first 8 hex chars of sha256 over the file's bytes
  const hash = (bytes: Buffer) =>
    createHash("sha256").update(bytes).digest("hex").slice(0, 8);
  const sum = (name: string) => hash(fs.readFileSync(file(name)));
  // one read, so the checksum always describes the text it comes with
  const read = (name: string) => {
    const bytes = fs.readFileSync(file(name));
    return { checksum: hash(bytes), text: bytes.toString("utf8") };
  };
  // edit and delete only run with the checksum from the last get or edit
  const check = (name: string, checksum: string | undefined) => {
    if (!checksum)
      throw new Error(`${name}: checksum required, get the file first`);
    if (checksum !== sum(name))
      throw new Error(`${name}: checksum stale, get the file again`);
  };

  return {
    create: ({ name }) => {
      fs.writeFileSync(file(name), "", { flag: "wx" });
      return `created ${name}`;
    },
    edit: ({ name, text, checksum }) => {
      check(name, checksum);
      fs.appendFileSync(file(name), text + "\n");
      return read(name);
    },
    delete: ({ name, checksum }) => {
      check(name, checksum);
      fs.unlinkSync(file(name));
      return `deleted ${name}`;
    },
    get: ({ name }) => read(name),
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
}

// answers window.tool(name, args) from preload.ts. Everything lives in
// <repo>/notes/.
export function registerTools(): void {
  const notes = path.join(app.getAppPath(), "..", "notes");
  fs.mkdirSync(notes, { recursive: true });
  const tools = makeTools(notes);
  ipcMain.handle("tool", (_e, name: string, args: Args = {}) => {
    const run = tools[name];
    if (!run) throw new Error(`no tool named ${name}`);
    return run(args);
  });
}

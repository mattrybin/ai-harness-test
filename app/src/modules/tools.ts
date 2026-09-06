import { createHash } from "node:crypto";
import * as fs from "node:fs";
import * as path from "node:path";

// The note tools. The brain (claude, see brain.ts) calls these over the
// MCP server in mcp.ts; the page calls list over IPC (main.ts). Plain node:
// mcp.js runs this outside Electron, so nothing here may import electron.
type Args = Record<string, string>;
type Tools = Record<string, (args: Args) => unknown>;

// The six tools over one flat directory of .md files.
export function makeTools(dir: string): Tools {
  // basename keeps every name inside dir, so "../x.md" cannot escape
  const file = (name: string) => path.join(dir, path.basename(name));
  const mdFiles = () => fs.readdirSync(dir).filter((n) => n.endsWith(".md"));
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

// deletes every note in dir. Reset calls this; it is not a tool, so the
// model cannot.
export function wipeNotes(dir: string): void {
  for (const name of fs.readdirSync(dir))
    if (name.endsWith(".md")) fs.unlinkSync(path.join(dir, name));
}

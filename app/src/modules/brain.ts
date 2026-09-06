// The brain: one long-lived `claude -p` process per conversation. say(text)
// writes a user turn to its stdin; every JSON line it prints goes to the
// page as a "brain" event; reset() kills it and wipes notes/. The only tools
// it has are the six in tools.ts, served by mcp.ts over stdio.
import { BrowserWindow, ipcMain } from "electron";
import { spawn, type ChildProcess } from "node:child_process";
import * as path from "node:path";
import * as readline from "node:readline";
import { wipeNotes } from "./tools.js";

const SYSTEM_PROMPT = `You keep a folder of short markdown notes for one person. You have six tools: list, get, create, edit, delete, grep. Files are flat .md files with kebab-case names like shopping.md. edit appends one line, so call it once per item. edit and delete need the checksum that get (or the previous edit) returned, so get a file before you change it, unless you already have its latest checksum from this conversation.
The person can only speak to you, through a speech-to-text model, so words are sometimes wrong, names are misspelled, and there is no punctuation. Read for intent, pick the most likely file and action, and do it. Never ask a question. If you are unsure, do the most likely thing and say what you did in one short sentence so the person can correct you by speaking again. Call list first when you do not know which file they mean.
Reply in one or two plain sentences. No markdown, no backticks, no checksums.`;

type BrainEvent = Record<string, unknown>;

// wires ipc "say" and "reset" for win; notes is the directory the tools run over
export function registerBrain(win: BrowserWindow, notes: string): void {
  let claude: ChildProcess | null = null;
  const send = (event: BrainEvent) => win.webContents.send("brain", event);

  const start = (): ChildProcess => {
    const mcp = {
      mcpServers: {
        notes: {
          type: "stdio",
          command: "node",
          args: [path.join(__dirname, "mcp.js"), notes],
        },
      },
    };
    const child = spawn(
      "claude",
      [
        "-p",
        "--verbose",
        "--input-format",
        "stream-json",
        "--output-format",
        "stream-json",
        "--tools",
        "",
        "--mcp-config",
        JSON.stringify(mcp),
        "--strict-mcp-config",
        "--allowedTools",
        "mcp__notes__*",
        "--permission-mode",
        "dontAsk",
        "--permission-prompts",
        "none",
        "--system-prompt",
        SYSTEM_PROMPT,
      ],
      // cwd is notes/ so the repo's CLAUDE.md never reaches the model
      { cwd: notes, stdio: ["pipe", "pipe", "pipe"] },
    );
    // a process that reset() replaced may still flush lines; drop them
    const live = () => claude === child;
    readline.createInterface({ input: child.stdout! }).on("line", (line) => {
      if (!live()) return;
      if (line.startsWith("{")) send(JSON.parse(line) as BrainEvent);
      else console.error(`claude: ${line}`);
    });
    child.stderr!.on("data", (data) => console.error(`claude: ${data}`));
    child.on("error", (err) => {
      if (!live()) return;
      claude = null;
      send({ type: "result", is_error: true, result: err.message });
    });
    child.on("exit", (code) => {
      if (!live()) return;
      claude = null;
      if (code)
        send({
          type: "result",
          is_error: true,
          result: `claude exited ${code}`,
        });
    });
    return child;
  };

  ipcMain.handle("say", (_e, text: string) => {
    claude ??= start();
    const turn = { type: "user", message: { role: "user", content: text } };
    claude.stdin!.write(JSON.stringify(turn) + "\n");
  });

  ipcMain.handle("reset", () => {
    const old = claude;
    claude = null;
    old?.kill();
    wipeNotes(notes);
  });
}

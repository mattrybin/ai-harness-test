// The tool log. Plain browser script: act() is called from listen.js;
// tool(), say(), resetBrain() and onBrain() come from preload.ts.
// act() sends the transcript to the brain; the brain's events render
// under the box until its result arrives.

const notes = document.getElementById("notes") as HTMLDivElement;
const reset = document.getElementById("reset") as HTMLButtonElement;
const files = document.getElementById("files") as HTMLDivElement;

declare const tool: (
  name: string,
  args?: Record<string, string>,
) => Promise<unknown>;
declare const say: (text: string) => Promise<void>;
declare const resetBrain: () => Promise<void>;
declare const onBrain: (cb: (event: BrainEvent) => void) => void;

type Entry = { name: string; size: number };
type Got = { checksum: string; text: string };
type Block =
  | { type: "text"; text: string }
  | {
      type: "tool_use";
      id: string;
      name: string;
      input: Record<string, string>;
    }
  | {
      type: "tool_result";
      tool_use_id: string;
      content: string | { type: string; text: string }[];
      is_error?: boolean;
    };
type BrainEvent = {
  type: string;
  message?: { content: Block[] };
  is_error?: boolean;
  result?: string;
};

const addBox = (text: string) => {
  const box = document.createElement("div");
  box.className =
    "rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3";
  box.textContent = text;
  notes.appendChild(box);
  return box;
};

// the result text of one tool, formatted for the log
const show = (name: string, text: string): string => {
  if (name === "list") {
    const entries = JSON.parse(text) as Entry[];
    return entries.length
      ? entries.map((e) => `${e.name} (${e.size} B)`).join("\n")
      : "(no files)";
  }
  if (name === "get" || name === "edit") {
    const got = JSON.parse(text) as Got;
    return `checksum: ${got.checksum}\n${got.text}`;
  }
  if (name === "grep") {
    const hits = JSON.parse(text) as string[];
    return hits.length ? hits.join("\n") : "(no matches)";
  }
  return text;
};

const addLine = (box: HTMLElement, text: string, color: string) => {
  const line = document.createElement("pre");
  line.className = `mt-2 whitespace-pre-wrap border-l-2 ${color} pl-3 font-mono text-xs text-neutral-400`;
  line.textContent = text;
  box.appendChild(line);
  return line;
};

const refreshFiles = async () => {
  const entries = (await tool("list")) as Entry[];
  files.innerHTML = "";
  if (!entries.length) {
    files.textContent = "(empty)";
    return;
  }
  for (const e of entries) {
    const row = document.createElement("div");
    row.textContent = `${e.name}  ${e.size} B`;
    files.appendChild(row);
  }
};

// the box the brain is answering right now, and how to end its turn
let current: HTMLElement | null = null;
let done: (() => void) | null = null;
// tool_use lines by block id, so the tool_result can fill them in
const pending = new Map<
  string,
  { name: string; head: string; line: HTMLElement }
>();

const resultText = (block: Block & { type: "tool_result" }) =>
  typeof block.content === "string"
    ? block.content
    : block.content.map((c) => c.text).join("\n");

onBrain((event) => {
  const box = current;
  if (!box) return;
  for (const block of event.message?.content ?? []) {
    if (block.type === "text") {
      addLine(box, block.text, "border-neutral-600").classList.replace(
        "font-mono",
        "font-sans",
      );
    } else if (block.type === "tool_use") {
      const name = block.name.replace(/^mcp__notes__/, "");
      const head = `${name}(${JSON.stringify(block.input)})`;
      const line = addLine(box, `${head} …`, "border-sky-700");
      pending.set(block.id, { name, head, line });
    } else if (block.type === "tool_result") {
      const use = pending.get(block.tool_use_id);
      pending.delete(block.tool_use_id);
      if (!use) continue;
      if (block.is_error) {
        use.line.textContent = `${use.head}\n✗ ${resultText(block)}`;
        use.line.classList.replace("border-sky-700", "border-red-500");
      } else {
        use.line.textContent = `${use.head}\n→ ${show(use.name, resultText(block))}`;
      }
      refreshFiles();
    }
  }
  if (event.type === "result") {
    if (event.is_error) addLine(box, `✗ ${event.result}`, "border-red-500");
    box.scrollIntoView({ block: "end" });
    done?.();
  }
});

// one utterance: a box, one turn to the brain, resolved when its result lands
const act = (said: string) =>
  new Promise<void>((resolve, reject) => {
    current = addBox(said);
    done = resolve;
    say(said).catch(reject);
  });

refreshFiles().catch((err: Error) => {
  live.textContent = `${err.name}: ${err.message}`;
});

reset.onclick = async () => {
  release();
  current = null;
  done?.();
  done = null;
  pending.clear();
  notes.innerHTML = "";
  live.textContent = "";
  await resetBrain();
  await refreshFiles();
};

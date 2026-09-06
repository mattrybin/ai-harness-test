// The brain and the tool log. Plain browser script: act() is called from
// listen.js, tool() comes from preload.ts.

const notes = document.getElementById("notes") as HTMLDivElement;
const reset = document.getElementById("reset") as HTMLButtonElement;
const files = document.getElementById("files") as HTMLDivElement;

// exposed by preload.ts
declare const tool: (
  name: string,
  args?: Record<string, string>,
) => Promise<unknown>;
type Entry = { name: string; size: number };

const addBox = (text: string) => {
  const box = document.createElement("div");
  box.className =
    "rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3";
  box.textContent = text;
  notes.appendChild(box);
  return box;
};

const show = (name: string, result: unknown): string => {
  if (name === "list") {
    const entries = result as Entry[];
    return entries.length
      ? entries.map((e) => `${e.name} (${e.size} B)`).join("\n")
      : "(no files)";
  }
  if (name === "grep") {
    const hits = result as string[];
    return hits.length ? hits.join("\n") : "(no matches)";
  }
  return String(result);
};

// one tool call: run it, print "name(args) → result" under the box
const call = async (
  box: HTMLElement,
  name: string,
  args?: Record<string, string>,
) => {
  const line = document.createElement("pre");
  line.className =
    "mt-2 whitespace-pre-wrap border-l-2 border-sky-700 pl-3 font-mono text-xs text-neutral-400";
  const argText = args ? JSON.stringify(args) : "";
  line.textContent = `${name}(${argText}) …`;
  box.appendChild(line);
  try {
    const result = await tool(name, args);
    line.textContent = `${name}(${argText})\n→ ${show(name, result)}`;
    return result;
  } catch (err) {
    line.textContent = `${name}(${argText})\n✗ ${(err as Error).message}`;
    line.classList.replace("border-sky-700", "border-red-500");
    throw err;
  }
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

// FAKE BRAIN. Stands in for the AI. Ignores what was said and walks
// shopping.md through: create → fill → (grep, get, delete).
const act = async (said: string) => {
  const box = addBox(said);
  const entries = (await call(box, "list")) as Entry[];
  const shopping = entries.find((e) => e.name === "shopping.md");
  if (!shopping) {
    await call(box, "create", { name: "shopping.md" });
  } else if (shopping.size === 0) {
    await call(box, "edit", { name: "shopping.md", text: said });
  } else {
    await call(box, "grep", { query: said.split(" ")[0] });
    await call(box, "get", { name: "shopping.md" });
    await call(box, "delete", { name: "shopping.md" });
  }
  await refreshFiles();
  box.scrollIntoView({ block: "end" });
};

refreshFiles().catch((err: Error) => {
  live.textContent = `${err.name}: ${err.message}`;
});

reset.onclick = () => {
  release();
  notes.innerHTML = "";
  live.textContent = "";
};

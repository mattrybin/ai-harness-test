const STT_URL = "http://127.0.0.1:8124/v1/audio/transcriptions";

const talk = document.getElementById("talk") as HTMLButtonElement;
const live = document.getElementById("live") as HTMLDivElement;
const notes = document.getElementById("notes") as HTMLDivElement;
const reset = document.getElementById("reset") as HTMLButtonElement;
const files = document.getElementById("files") as HTMLDivElement;

// exposed by preload.ts
declare const tool: (
  name: string,
  args?: Record<string, string>,
) => Promise<unknown>;
type Entry = { name: string; size: number };

const HELD = ["bg-red-500", "animate-ring"];
const IDLE = ["bg-sky-700"];

let held = false;
let recorder: MediaRecorder | null = null;

const setIdle = () => {
  talk.classList.remove(...HELD);
  talk.classList.add(...IDLE);
};

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
// shopping.md through: create → fill → (list, grep, delete).
const act = async (said: string) => {
  const box = addBox(said);
  const entries = (await call(box, "list")) as Entry[];
  const shopping = entries.find((e) => e.name === "shopping.md");
  if (!shopping) {
    await call(box, "create", { name: "shopping.md" });
  } else if (shopping.size === 0) {
    await call(box, "edit", { name: "shopping.md", text: said });
  } else {
    await call(box, "grep", { query: said.split(" ")[0] ?? "" });
    await call(box, "delete", { name: "shopping.md" });
  }
  await refreshFiles();
  box.scrollIntoView({ block: "end" });
};

const transcribe = async (blob: Blob) => {
  const body = new FormData();
  body.append("file", blob, "hold.webm");
  body.append("response_format", "text");
  const res = await fetch(STT_URL, { method: "POST", body });
  if (!res.ok) throw new Error(`stt: ${res.status} ${res.statusText}`);
  return (await res.text()).trim();
};

// while held: record the mic
talk.onpointerdown = async () => {
  if (held) return;
  held = true;
  talk.classList.remove(...IDLE);
  talk.classList.add(...HELD);
  live.textContent = "Listening…";
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    setIdle();
    live.textContent = `${(err as Error).name}: ${(err as Error).message}`;
    return;
  }
  if (!held) {
    // released while the mic prompt was up
    stream.getTracks().forEach((t) => t.stop());
    live.textContent = "";
    return;
  }
  const chunks: Blob[] = [];
  recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (e) => chunks.push(e.data);
  recorder.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop());
    live.textContent = "Transcribing…";
    try {
      const text = await transcribe(new Blob(chunks));
      if (text) await act(text);
      live.textContent = "";
    } catch (err) {
      live.textContent = `${(err as Error).name}: ${(err as Error).message}`;
    }
  };
  recorder.start();
};

// on release: stop recording, the transcript becomes a box
const release = () => {
  if (!held) return;
  held = false;
  if (recorder && recorder.state !== "inactive") recorder.stop();
  recorder = null;
  setIdle();
};
talk.onpointerup = release;
talk.onpointerleave = release;

refreshFiles();

reset.onclick = () => {
  release();
  notes.innerHTML = "";
  live.textContent = "";
};

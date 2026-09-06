const STT_URL = "http://127.0.0.1:8124/v1/audio/transcriptions";

const talk = document.getElementById("talk") as HTMLButtonElement;
const live = document.getElementById("live") as HTMLDivElement;
const notes = document.getElementById("notes") as HTMLDivElement;
const reset = document.getElementById("reset") as HTMLButtonElement;

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
      if (text) addBox(text);
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

reset.onclick = () => {
  release();
  notes.innerHTML = "";
  live.textContent = "";
};

// Hold-to-talk. While the button is held the mic records; on release the
// audio goes to the local STT server and the transcript goes to act() in
// renderer.ts. Plain browser script: shares its globals with renderer.js.

const STT_URL = "http://127.0.0.1:8124/v1/audio/transcriptions";

const talk = document.getElementById("talk") as HTMLButtonElement;
const live = document.getElementById("live") as HTMLDivElement;

const HELD = ["bg-red-500", "animate-ring"];
const IDLE = ["bg-sky-700"];

let held = false;
let recorder: MediaRecorder | null = null;

const setIdle = () => {
  talk.classList.remove(...HELD);
  talk.classList.add(...IDLE);
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

// on release: stop recording, the transcript goes to the brain
const release = () => {
  if (!held) return;
  held = false;
  if (recorder && recorder.state !== "inactive") recorder.stop();
  recorder = null;
  setIdle();
};
talk.onpointerup = release;
talk.onpointerleave = release;

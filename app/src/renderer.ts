const SAMPLES = [
  "Remind me to call the dentist tomorrow at nine.",
  "Okay so the idea is we keep the harness tiny and only add one thing per step.",
  "Buy milk, eggs, and the good coffee, not the cheap one.",
  "Meeting notes: Sam owns the deploy, Priya owns the tests, I own the writeup.",
];

const talk = document.getElementById("talk") as HTMLButtonElement;
const live = document.getElementById("live") as HTMLDivElement;
const notes = document.getElementById("notes") as HTMLDivElement;
const reset = document.getElementById("reset") as HTMLButtonElement;

const HELD = ["bg-red-500", "animate-ring"];
const IDLE = ["bg-sky-700"];

let timer: ReturnType<typeof setInterval> | null = null;

// while held: keep feeding words in, sentence after sentence
talk.onpointerdown = () => {
  if (timer) return;
  talk.classList.remove(...IDLE);
  talk.classList.add(...HELD);
  const words = SAMPLES.join(" ").split(" ");
  let i = 0;
  live.textContent = "";
  timer = setInterval(() => {
    live.textContent += (i ? " " : "") + words[i % words.length];
    i++;
  }, 180);
};

// on release: what was said becomes a box
const release = () => {
  if (!timer) return;
  clearInterval(timer);
  timer = null;
  talk.classList.remove(...HELD);
  talk.classList.add(...IDLE);
  if (live.textContent) {
    const box = document.createElement("div");
    box.className =
      "rounded-lg border border-neutral-700 bg-neutral-800 px-4 py-3";
    box.textContent = live.textContent;
    notes.appendChild(box);
  }
  live.textContent = "";
};
talk.onpointerup = release;
talk.onpointerleave = release;

reset.onclick = () => {
  release();
  notes.innerHTML = "";
};

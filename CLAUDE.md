# ai-harness-test

One unit: `app/`, a minimal Electron app written in TypeScript. No framework, no bundler. Tailwind v4 CLI compiles the CSS.

## Map

- `app/src/main.ts` — Electron main process. Creates the one window.
- `app/src/modules/tools.ts` — the note tools (`create`, `edit`, `get`, `delete`, `list`, `grep`) over `notes/`, served over IPC.
- `app/src/preload.ts` — exposes `window.tool(name, args)` to the page.
- `app/src/index.html` — the renderer page the window loads. Tailwind classes, no inline CSS or JS.
- `app/src/modules/listen.ts` — hold-to-talk: mic recording and the STT call. Hands the transcript to `act()`.
- `app/src/renderer.ts` — the brain and the tool log. Both page scripts are classic browser scripts, not ES modules, and share one global scope.
- `notes/` — files the app writes at runtime. Git-ignored.
- `app/src/styles.css` — Tailwind v4 entry. `npm run build:css` compiles it.
- `app/dist/` — `tsc` and Tailwind output. Git-ignored. Never edit.
- `app/Makefile` — the app's recipes. The root `Makefile` only delegates, here or to `bin/`.
- `bin/setup`, `bin/dev`, `bin/stt` — what `make setup`, `make dev`, `make stt` and `make stt-model` call.

## Commands (run from the repo root)

| command | does |
|---|---|
| `make setup` | fresh clone to runnable (`npm ci`) |
| `make dev` | compile and open the app, and start the STT server beside it |
| `make stt` | run the local whisper.cpp speech-to-text server (macOS, port 8124) |
| `make stt-model` | fetch and verify the 1.6 GB model into `models/` without starting the server |
| `make precommit` | typecheck + format, run before every commit |
| `make ci` | what CI runs: typecheck + format check, non-mutating |

## House rules

- Base branch is `development`. Branch before changing code.
- Run `make precommit` before every commit.
- Exact versions in `app/package.json`. No `^`, no `~`. Update deps on purpose.
- Keep it minimal. A new dependency needs a reason written in the PR.
- The only input is the hold-to-talk button. No text input, no "type it instead" fallback, not even for testing.

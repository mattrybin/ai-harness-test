# ai-harness-test

A minimal Electron app in TypeScript. One window, one renderer page, nothing else.

## Why

A small, real desktop app to test AI coding harnesses against. Small on purpose: the
harness is the thing under test, not the app.

## Structure

- `app/` — the Electron app (main process in `src/main.ts`, renderer in `src/index.html`)
- `bin/` — `setup`, `dev` and `stt`, the scripts a human runs directly
- `docs/` — [init state](docs/init.md) and any further notes

## Quick start

```sh
make setup
make dev
```

`make precommit` runs the local gate. `make ci` runs what CI runs. Every target lives in
the root `Makefile` and delegates to `app/Makefile` or a `bin/` script.

## Speech to text

`make dev` also starts a local [whisper.cpp](https://github.com/ggml-org/whisper.cpp)
server at `http://127.0.0.1:8124/v1/audio/transcriptions`, the OpenAI transcription route.
Hold the mic button to record, release to transcribe; the text becomes a note. macOS only;
needs `brew install whisper-cpp ffmpeg`. The first run downloads the 1.6 GB model to
`models/` (git-ignored). `make stt-model` fetches the model without starting the server.
`make stt` runs the server on its own; `make dev` then sees the port in use and skips it.

The first hold asks for microphone access. In dev, macOS files that permission under the
terminal app you ran `make dev` from, not under "Electron".

`STT_PORT` overrides the port for `bin/dev` and `bin/stt`. The app itself always calls
port 8124.

## Brain

What you say goes to one long-lived `claude -p` process, the installed Claude Code CLI on
your login. It has the six note tools over `notes/` and nothing else, never asks a question,
and keeps the conversation across holds. Reset kills it and empties `notes/`. Needs `claude`
on `PATH` and logged in (`claude auth status`), and `node` on `PATH` for the tool server.
Run `make dev` from a terminal; the app finds `claude` through that shell's `PATH`.

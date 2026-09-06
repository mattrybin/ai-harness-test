# ai-harness-test

## Matt note

So what I would do next is to create a state machine of this "brain" and add react components as working with html is not super nice.

I only worked inside one session as to have one session file to send, normally I would work with many sessions at once.

A minimal Electron app in TypeScript. One window, one hold-to-talk button, and a `claude`
process behind it that keeps a folder of markdown notes.

## Why

A small, real desktop app to test AI coding harnesses against. Small on purpose: the
harness is the thing under test, not the app.

## Run it

Needs macOS, `node` (version in `.tool-versions`), `brew install whisper-cpp ffmpeg`, and
the Claude Code CLI logged in (`claude auth status`).

```sh
make setup
make dev
```

`make dev` compiles the app, starts the local speech-to-text server, and opens the window.
Hold the button, speak, release. The transcript goes to `claude`, `claude` calls the note
tools, and the tool log under the button shows what it did. Reset kills the `claude`
session and empties `notes/`.

`make precommit` runs the local gate (typecheck, format, tests). `make ci` runs what CI
runs. Every target lives in the root `Makefile` and delegates to `app/Makefile` or a
`bin/` script.

## What works

- Hold-to-talk records the mic and transcribes it locally (`app/src/modules/listen.ts`).
- One long-lived `claude -p` per conversation, stream-json both ways, so "add milk to
  that" works across holds (`app/src/modules/brain.ts`).
- Six note tools over `notes/`: `list`, `get`, `create`, `edit`, `delete`, `grep`
  (`app/src/modules/tools.ts`). `claude` reaches them over a hand-written stdio MCP server
  (`app/src/modules/mcp.ts`). The page shows the resulting files and every tool call.
- `edit` and `delete` need the checksum that `get` returned, so a stale read cannot
  overwrite a newer write.
- Tests for the tools and the MCP server run under `node --test` without Electron.

## What I cut

**Editing is append-only.** `edit` adds one line to the end of a file
(`app/src/modules/tools.ts`, `fs.appendFileSync`). There is no replace, no delete-a-line,
no reorder. "Remove milk from shopping" cannot be done today; the model's only move is to
`delete` the file and `create` it again, and the system prompt does not tell it to.

That is the next thing I would build: a real `edit` that takes `old` and `new` text and
replaces one occurrence, keeping the checksum rule. It is the change the checksum design
was made for.

## Structure

- `app/` — the Electron app (main process in `src/main.ts`, page in `src/index.html` and
  `src/renderer.ts`, the modules in `src/modules/`, tests in `src/test/`)
- `bin/` — `setup`, `dev` and `stt`, the scripts a human runs directly
- `notes/` — the files the app writes at runtime, git-ignored

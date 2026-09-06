# ai-harness-test

A minimal Electron app in TypeScript. One window, one renderer page, nothing else.

## Why

A small, real desktop app to test AI coding harnesses against. Small on purpose: the
harness is the thing under test, not the app.

## Structure

- `app/` — the Electron app (main process in `src/main.ts`, renderer in `src/index.html`)
- `bin/` — `setup` and `dev`, the two scripts a human runs directly
- `docs/` — [init state](docs/init.md) and any further notes

## Quick start

```sh
make setup
make dev
```

`make precommit` runs the local gate. `make ci` runs what CI runs. Every target lives in
the root `Makefile` and delegates to `app/Makefile`.

# ai-harness-test

One unit: `app/`, a minimal Electron app written in TypeScript. No framework, no bundler.

## Map

- `app/src/main.ts` — Electron main process. Creates the one window.
- `app/src/index.html` — the renderer page the window loads.
- `app/dist/` — `tsc` output. Git-ignored. Never edit.
- `app/Makefile` — the real recipes. The root `Makefile` only delegates here.
- `bin/setup`, `bin/dev` — what `make setup` and `make dev` call.

## Commands (run from the repo root)

| command | does |
|---|---|
| `make setup` | fresh clone to runnable (`npm ci`) |
| `make dev` | compile and open the app |
| `make precommit` | typecheck + format, run before every commit |
| `make ci` | what CI runs: typecheck + format check, non-mutating |

## House rules

- Base branch is `development`. Branch before changing code.
- Run `make precommit` before every commit.
- Exact versions in `app/package.json`. No `^`, no `~`. Update deps on purpose.
- Keep it minimal. A new dependency needs a reason written in the PR.

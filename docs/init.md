# Project init state

Written by `/project:init`. Each row is one checklist item and what this repo decided
about it. Re-running checks reality against this table: `done` rows are re-verified
silently, `deviates`/`skipped` rows stay quiet, and any checklist item missing from
this table is asked as new.

Last run: 2026-09-06 · mode: one run · items covered: A1–G5

| id | item | status | decision |
|----|------|--------|----------|
| A1 | git repo + base branch | done | base branch is `development` |
| A2 | `.gitignore` | done | node_modules, app/dist, env, editor, OS |
| A3 | root `README.md` | done | was empty; written with what/why/structure/quick start |
| A4 | root `CLAUDE.md` | done | map, commands table, house rules |
| A5 | `docs/` | done | README links to `docs/init.md` |
| A6 | GitHub repo + merge settings | done | private, squash-only, branch protection left for later |
| B1 | units + stacks | done | one unit, electron + typescript. install `npm ci` · dev `npm start` (`tsc && electron .`) · check `npm run precommit` (`tsc --noEmit && prettier --write .`) · ci `npm run typecheck` + `npm run format:check` · pin `.tool-versions` nodejs, `app/package-lock.json`, build output `dist` |
| B2 | where the code lives | done | `app/` |
| B3 | one folder per unit | done | everything but repo config is in `app/` |
| B4 | per-unit `Makefile` | done | `app/Makefile`: install, server, check, ci |
| B5 | per-unit `README.md` | done | `app/README.md` |
| B6 | `packages/` | n/a | no shared code |
| C1 | root `Makefile` exists | done | |
| C2 | delegates when the app is in a folder | done | every target is `$(MAKE) -C app` or a `bin/` script |
| C3 | `make dev` | done | `bin/dev` → `make -C app server`, foreground |
| C4 | `make precommit` | done | → `app` `check` |
| C5 | `make ci` | done | → `app` `ci` |
| C6 | `make stop` | n/a | `make dev` runs in the foreground; Ctrl-C stops it |
| C7 | `bin/setup` and `bin/dev` | done | node/npm guards, then `make -C app install` |
| D1 | one canonical local gate | done | `npm run precommit` |
| D2 | `make check` in the unit | done | wraps D1 |
| D3 | `make ci` in the unit | done | `npm ci`, typecheck, `prettier --check` |
| D4 | `make install` | done | `npm ci` |
| D5 | `make server` | done | `npm start` |
| D6 | formatter config + format check | done | prettier defaults, `.prettierignore` for dist and lockfile; `--check` in ci |
| E1 | runtime versions pinned in-repo | done | `.tool-versions`: nodejs 26.0.0 |
| E2 | lockfiles committed | done | `app/package-lock.json` |
| E3 | exact versions in manifests | done | four devDependencies, all exact |
| E4 | version agreement | done | CI reads `.tool-versions`; no engines field, no Dockerfile |
| F1 | `docs/architecture.md` | skipped | minimal app; README covers the shape |
| F2 | `docs/techstack.md` | skipped | four deps, listed in `app/package.json` |
| F3 | `docs/dev-setup.md` | skipped | node, `whisper-cpp`/`ffmpeg` and a logged-in `claude` are needed; README says so |
| F4 | `docs/UBIQUITOUS_LANGUAGE.md` | skipped | no domain yet |
| G1 | `.github/workflows/ci.yml` | done | setup-node from `.tool-versions`, then `make ci` |
| G2 | `Dockerfile` | n/a | desktop app, nothing ships as a container |
| G3 | `docker-compose.dev.yml` | n/a | no local services |
| G4 | deploy workflow | skipped | nothing to deploy yet |
| G5 | `.github/workflows/code-stats.yml` | done | `UNIT: app`, `EXCLUDE_DIRS: node_modules,dist` |

## Retired items

Items recorded by an older version of the command that the checklist no longer has.
Kept for history; never re-asked.

| id | item | last status | note |
|----|------|-------------|------|

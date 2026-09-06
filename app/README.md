# app

Minimal Electron app in TypeScript. `src/main.ts` opens one window that loads `src/index.html`.

```sh
make install   # npm ci
make server    # tsc && electron .
make check     # typecheck + format + tests (local gate)
make ci        # typecheck + format check + tests (what CI runs)
```

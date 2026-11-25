---
title: Run throwaway tsc probes with --ignoreConfig and prove the type import resolved
description: TypeScript 7 (`node_modules/.bin/tsc`, 7.0.2) exits 1 with TS5112 when files are passed on the command line while a tsconfig exists, unless `--ignoreConfig` is passed; and a probe whose type import fails to resolve (TS2307) collapses the imported types to `any`, so every call compiles and every `@ts-expect-error` reports TS2578 unused.
tags: [tsc, typescript, probe, ts-expect-error, overload, plan]
confirmed: 2026-11-25
---

# Why

`plan` requires a throwaway `tsc` probe before any delta premised on type-system behavior (overload resolution, inference) is written into a contract. Two failure modes make such a probe lie or stall in this repo, and both look like a false premise:

1. Passing a file to `tsc` while the repo's `tsconfig.json` is present fails with `error TS5112: tsconfig.json is present but will not be loaded if files are specified on commandline. Use '--ignoreConfig' to skip this error.` The run looks like a probe failure; it is a flag.
2. A relative type import that does not resolve (`error TS2307: Cannot find module './lib/types'`) degrades every imported type to `any`. Every "compiles" line then passes and every `// @ts-expect-error` line reports `TS2578: Unused '@ts-expect-error' directive`, which reads as "the premise is wrong" when the probe never type-checked anything.

# Evidence

Working invocation for a scratch file under `packages/css/tests/` (deleted afterwards), verified 2026-11-25 with `node_modules/typescript` 7.0.2:

    ./node_modules/.bin/tsc --ignoreConfig --noEmit --strict --skipLibCheck \
      --target es2022 --module esnext --moduleResolution bundler \
      packages/css/tests/scratch-overload-probe.ts

Exit 0 with empty output means: every line meant to compile compiled and every `@ts-expect-error` was consumed (an unconsumed directive is itself an error). The probe imported the real `StyleObject` / `StyleOptions` with `import type { ... } from "../lib/types"` (from `tests/`, the path is `../lib/types`, not `./lib/types`; it resolves to `lib/types.d.ts`, whose `csstype` dependency resolves through the root `node_modules` walk-up).

Checks before trusting a red probe: `rg TS2307` on the output first (a failed import invalidates every other line); then delete one `@ts-expect-error` line and confirm the probe goes red, proving the checker is live. The repo's lint path (`vp run lint`, tsgo) is not a substitute: the probe exists precisely because the declared overload set does not exist in source yet.

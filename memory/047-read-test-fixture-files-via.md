---
title: Read test-fixture files via import.meta.dirname, never new URL(import.meta.url), under vp test
description: The vitest module runner's import.meta.url is not a file-scheme URL, so new URL(relative, import.meta.url) fed to node:fs throws "The URL must be of scheme file" — resolve fixture paths with join(import.meta.dirname, relative) instead.
tags: [vitest, testing, fixtures, import-meta, module-runner]
confirmed: 2026-10-25
---
# Why

`vp test` loads test modules through vite's module runner, which does not present
`import.meta.url` as a `file://` URL. `readFileSync(new URL("./x.txt", import.meta.url))`
therefore fails at load with `TypeError: The URL must be of scheme file` — the failure is at
module evaluation, so every test in the file fails before running. `import.meta.dirname`
works (the runner provides it), and it is the established in-repo pattern for
module-relative reads (`packages/ui/lib/loadRegistry.ts` anchors `REGISTRY_DIR` with it and
runs green under the same runner).

# Evidence

Failing form 2026-10-25: `readFileSync(new URL("../../../docs/src/components/ui/accordion.tsx",
import.meta.url), "utf8")` at a `packages/ui/tests/*.test.tsx` module scope — `TypeError: The
URL must be of scheme file` under `./node_modules/.bin/vp test`. Passing form:
`readFileSync(join(import.meta.dirname, "../../../docs/src/components/ui/accordion.tsx"),
"utf8")` — same file, suite 3/3. Precedent: `packages/ui/lib/loadRegistry.ts` (`import.meta.dirname`
anchor), sibling suites leading `vite-plus/test` then `node:fs`/`node:path` imports
(`packages/ui/tests/compile.test.ts`, `main.test.ts`, `registry.test.ts`).

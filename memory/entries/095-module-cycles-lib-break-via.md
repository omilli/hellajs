---
type: decision
title: "Module cycles in lib/ break via module-init registration (setMountNode / setDeferredAdopters); import type back-edges are fine — they erase at compile, leaving no runtime cycle"
description: "A value-import cycle between internal modules is broken by registering the needed fns at module init (setMountNode pattern); a type-only back-edge is acceptable since it erases at compile."
tags: [arch, dom]
timestamp: 2026-09-06
last_confirmed: 2026-09-06
triggers: [module-split, import-cycle, setmountnode-pattern, registration-cycle-break, internal-module-split, type-only-import]
---

# Why

The repo carries **zero runtime import cycles** by design (verified by graph walk over `packages/dom/lib` this session — none). When a module split creates one (hydrate.ts needs the split-out module's state accessors; the split-out module needs hydrate.ts's walker-coupled fns), the sanctioned fix is the **module-init registration** pattern, NOT accepting the cycle and NOT duplicating shapes:

1. The needing module holds `let fnName!: Fn` module state + a `setX(fn)` registrar (exported `@internal`).
2. The owning module calls `setX(fn)` at module-init (top-level, right after the fn declarations) with a one-line comment naming the cycle break.
3. Safe by construction: registration runs during the owner's module evaluation, which always precedes any call into the needing module (every entry path imports the owner first).

Two precedents: `setMountNode` (`lib/mount.ts` registers `mountNode` into `lib/internal/dispatch.ts` — breaks render↔dispatch) and `setDeferredAdopters` (`lib/internal/hydrate.ts` registers `adoptRegion` + `swapSuspenseStage` into `lib/internal/deferred.ts` — breaks hydrate↔deferred).

**`import type` back-edges are the exception that stays.** A static cycle that exists only through `import type` (deferred.ts pulls `StageSwapResult` from hydrate.ts) erases at compile: tsc resolves it, the bundler never sees it, and the runtime value-import graph stays acyclic. Do NOT dodge a type-only edge by duplicating a shape inline — code.md's named-type rule ("reference it by name at every signature, never re-inline") outranks cycle-purity, and the type must co-locate with the implementation that introduces it anyway.

What breaks if ignored: accepting a runtime cycle makes module-init order load-bearing in the emitted bundle (works until a bundler reorder silently breaks registration-before-use); duplicating the shape to avoid the type edge lets two copies drift.

# Evidence

- `packages/dom/lib/internal/dispatch.ts` — `mountNodeFn` state + `setMountNode`/`getMountNode` (read in full, 2026-09-06); `packages/dom/lib/mount.ts` — `setMountNode((node) => mountNode(node))` at module init with the `// Wrapper breaks circular import` comment.
- `packages/dom/lib/internal/deferred.ts` (new, 2026-09-06) — `let adoptRegionFn!:` / `let swapStageFn!:` + `setDeferredAdopters`; `lib/internal/hydrate.ts` — `setDeferredAdopters(adoptRegion, swapSuspenseStage);` after `adoptRegion`, one-line cycle comment; `import type { StageSwapResult } from "./hydrate"` is the type-only back-edge.
- Graph detector (python over `rg`-equivalent import scan): runtime-value cycles **NONE** repo-wide; cycles only appear when type edges are included.
- `bun coverage dom` exit 0 (428/428, 99.51% funcs / 100.00% lines) — the deferred-path suites (`hydrate-selective`, `hydrate-suspense`) exercise the registered fns end-to-end, proving registration-before-use holds in the emitted bundle.

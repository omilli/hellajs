## [ ] Rewrite guides/tests.md for explicit-import testing
**Type:** Docs

### Depends On
- Migrate test harness off globals to explicit imports

### Objective
`guides/tests.md` documents the explicit-import, no-globals testing model: imports from `@hellajs/core` and owning packages, the `utils/test-helpers.ts` shared helpers, the `await Promise.resolve()` microtask idiom, and the `resetTestState` orchestrator.

### Solution
Edit `guides/tests.md` in place (no new file). Changes:
- Delete the entire `## Globals Reference` section (Reactive Primitives, Async Helpers, DOM Helpers, Package-Exported Testing Utilities tables) and the `beforeEach`/`resetTestState` prose that assumes globals.
- Replace the "Never import reactive primitives… they're globals" anti-pattern with its inverse: tests import every symbol they use — reactive primitives from `@hellajs/core`, dom API from `@hellajs/dom/bundle`, shared helpers from `utils/test-helpers.ts`.
- Rewrite the import-order rule to name the real imports (`bun:test` → `@hellajs/core` → owning package `/bundle` → `utils/test-helpers` → `import type`).
- Rewrite the async guidance: `await tick(0)` → `await Promise.resolve()`; real time → `await new Promise(r => setTimeout(r, ms))`; polling → `wait()` from `utils/test-helpers.ts`. Drop the `tick` decision tree (no `tick` symbol anymore).
- Rewrite the testing-utilities section to point at `resetTestState` (imported from `utils/test-helpers.ts`) and each package's `reset*()` nuke, with the `beforeEach` composition recipe.
- Keep the `flush()` rule but document `flush` as an explicit `import { flush } from "@hellajs/core"` (operational primitive), and document the `mount()` handle's `flush()`/`unmount()` as the dom lifecycle mechanism.

### Definition of Done
- [ ] Every code example in the changed `guides/tests.md` reflects the actual explicit-import signatures (cross-checked against `utils/test-helpers.ts` and the package barrels)
- [ ] The `## Globals Reference` section is gone, and no claim remains that reactive primitives / dom helpers / async helpers are globals
- [ ] No claim contradicts the implementation — cross-checked against `utils/test-helpers.ts`, `utils/happydom.js`, and the package `reset*` exports
- [ ] File name unchanged (`guides/tests.md`, edited in place)

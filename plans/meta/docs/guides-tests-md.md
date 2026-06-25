# [ ] guides-tests-md

## Contract

### Surface change
no — no package `index.ts` barrel is touched; this plan rewrites a project style guide in place. Non-package work is Surface change: `no` by definition.

### Package
meta — cross-cutting style-guide edit; not a package workspace (no `index.ts`).

### Guide governance
- Files ← `code.md` §Config Verification Checklist (by convention for authoring artifacts under `guides/`, per the `plans/meta/misc/add-plan-strategy-examples.md` precedent for `.agents/skills/`). NOTE: `docs.md` does NOT govern `guides/*.md` — guides are authoring artifacts consumed by the audit/worker skills, not published API docs. ALSO NOTE: `tests.md` self-describes its own conventions (it is the artifact being rewritten), so this task is bound to match the test harness's actual behavior, not to a higher-authority doc guide.

### Files
- `guides/tests.md` — modify (in place) — five coordinated edits:
  - Delete the entire `## Globals Reference` section (Reactive Primitives, Async Helpers, DOM Helpers, Package-Exported Testing Utilities tables) and the `beforeEach`/`resetTestState` prose that assumes globals.
  - Invert the "Never import reactive primitives… they're globals" anti-pattern: tests import every symbol they use — reactive primitives from `@hellajs/core`, dom API from `@hellajs/dom/bundle`, shared helpers from `utils/test-helpers.ts`.
  - Rewrite the import-order rule to name the real imports: `bun:test` → `@hellajs/core` → owning package `/bundle` → `utils/test-helpers` → `import type`.
  - Rewrite the async guidance: `await tick(0)` → `await Promise.resolve()`; real time → `await new Promise(r => setTimeout(r, ms))`; polling → `wait()` from `utils/test-helpers.ts`. Drop the `tick` decision tree (no `tick` symbol anymore).
  - Rewrite the testing-utilities section to point at `resetTestState` (imported from `utils/test-helpers.ts`) and each package's `reset*()` nuke, with the `beforeEach` composition recipe. Keep the `flush()` rule but document `flush` as an explicit `import { flush } from "@hellajs/core"` (operational primitive), and document the `mount()` handle's `flush()`/`unmount()` as the dom lifecycle mechanism.

### Tests view
No impact. `guides/tests.md` is a project style guide, not source under `packages/*/lib/`; `tests.md` §Files governs `packages/*/tests/**` named after a public surface. No `test()` applies. (The guide describes testing, but is itself an authoring artifact.)

### Docs view
This plan IS the docs task — `guides/tests.md` is rewritten to match the explicit-import, no-globals testing model the test-harness migration lands. `docs.md` does NOT govern guides (authoring artifacts); `code.md` §Config Verification Checklist applies by convention (precedent: `plans/meta/misc/add-plan-strategy-examples.md`), and `tests.md` self-describes its own conventions (it is the artifact being rewritten, bound to match the real harness behavior).

---

## [ ] Rewrite guides/tests.md for explicit-import testing
**Type:** Docs
**Depends on:** None

### Strategy
Cross-PLAN dependency (NOT intra-file `Depends on:`): the test-harness migration off globals to explicit imports (`utils/test-helpers.ts`) must land first — this rewrite describes that reality, so prose must not precede behavior. Edit `guides/tests.md` in place (no new file). The five coordinated edits anchored in Contract.Files are all in service of one goal: every claim in the guide reflects what a test author actually types today. The two highest-leverage edits are (a) deleting the `## Globals Reference` section wholesale — it is the strongest signal of the old model and leaving any sub-table would keep the anti-pattern alive — and (b) inverting the "never import" anti-pattern into a positive import rule, since that inversion is the entire conceptual axis of the migration. The async rewrite drops the `tick` decision tree entirely because the `tick` symbol no longer exists; the three-replacement ladder (`Promise.resolve()` / `new Promise(r => setTimeout(r, ms))` / `wait()`) covers every real case. Trade-off considered and rejected: keeping a deprecated "globals (legacy)" note for a release cycle — would contradict the single-source-of-truth rule and the test-harness plan's clean break, leaving audit/worker skills parsing a stale model.

### Definition of Done
- [ ] Every code example in the changed `guides/tests.md` reflects the actual explicit-import signatures (cross-checked against `utils/test-helpers.ts` and the package barrels)
- [ ] The `## Globals Reference` section is gone, and no claim remains that reactive primitives / dom helpers / async helpers are globals
- [ ] No claim contradicts the implementation — cross-checked against `utils/test-helpers.ts`, `utils/happydom.js`, and the package `reset*` exports
- [ ] File name unchanged (`guides/tests.md`, edited in place)

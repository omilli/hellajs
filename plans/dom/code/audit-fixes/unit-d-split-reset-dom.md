---
depends_on: [unit-a-import-order]
---

# [ ] Unit D: Split reset-dom.test.ts into two files

## Type tag

Tests + Docs (AGENTS.md).

## Surface fork

No. The `resetDom` and `MountHandle` exports are already public; no signature changes.

## Files

### `packages/dom/tests/reset-dom.test.ts` (after Unit A consolidates its imports)
- Remove the `describe("MountHandle", ...)` block (tests L20–80).

### `packages/dom/tests/mount-handle.test.ts` (new file)
- Contains the `describe("MountHandle", ...)` block moved from `reset-dom.test.ts`.
- Import only what the moved tests need: `bun:test`, `test-helpers` (`delay`, `resetTestState`), `@hellajs/dom/bundle` (`mount`, `html`), `import type` (`HellaNode` if needed).
- Follow the new import-order convention from Unit A.
- `beforeEach(() => { resetTestState(); })`.

### `packages/dom/AGENTS.md`
- In §Testing approach (lines 232–246), add a `mount-handle.test.ts` entry after `mount.test.ts`: mount handle container/flush/unmount/async-cancellation behavior.

## Definitions of Done

- [ ] `reset-dom.test.ts` no longer contains `describe("MountHandle", ...)`
- [ ] `packages/dom/tests/mount-handle.test.ts` exists with the moved MountHandle tests
- [ ] `mount-handle.test.ts` uses imports matching the Unit A convention
- [ ] `mount-handle.test.ts` has a `beforeEach(() => { resetTestState(); })`
- [ ] `packages/dom/AGENTS.md` has a `mount-handle.test.ts` entry in its testing-approach list
- [ ] `bun coverage dom` is green

## Strategy

Pure mechanical split after Unit A has consolidated `reset-dom.test.ts`'s imports. Copy the `describe("MountHandle", ...)` block and its deps into a new `mount-handle.test.ts`, then delete it from the original. The new file inherits the same `beforeEach`. The AGENTS.md update adds one bullet line in the correct position (alphabetically after `mount-edge-cases.test.ts` and `mount.test.ts` in the list). The original `reset-dom.test.ts` keeps its `describe("resetDom", ...)` block and the `resetDom` import.

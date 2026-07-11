# [x] Unit 2 — harden ssr switch + close ForEach-mismatch cursor loss; document C1

---
depends_on: [test-hygiene]
---

## Scope

- **C2 (Minor — latent Breaks):** `walkChild` in `packages/ssr/lib/ssr.ts` had an exhaustive `switch (meta.kind)` with no `default`; the switch was not terminal, so an unrecognized `kind` would fall through to `resolveValue(child)` (calling the `RenderFn` with no parent). Hardened.
- **C3 (Minor — edge Breaks):** `hydrateForEach` (`packages/dom/lib/internal/hydrate.ts`) count-mismatch re-mount returned `null` (lost the DOM cursor — siblings after a mid-list ForEach misaligned) AND mounted the fresh list at the parent's end (wrong position). Fixed.
- **C1 (Major — Breaks) — REVISED to a contract doc-note.** The planned Code fix (mirror `appendToParent`'s isDynamic-resolved `Proxy` branch into `mountReactiveAt`) was **traced and rejected before execution**: on hydrate, `clearRenderedNodes` starts empty so the server items are not removed, then the Proxy mounts fresh items before them → **duplication** (fresh + stale server nodes), net-negative vs the current error-dispatch. Deeper tracing showed the input itself (a reactive getter returning a bare isDynamic `RenderFn`) is unsupported by `ssr` — `walkChild` stringifies the function, so there are no server nodes to adopt in real `ssr()+hydrate()` usage. The smallest *correct* change is therefore documenting the contract, not papering over hydrate with a duplicating Proxy mirror.
- **Surface: no** — internal helpers + AGENTS.md prose only; no public signature changes. `ssr`'s output for the 4 existing kinds is byte-identical.
- **Type:** Code + Tests + Docs.
- **Depended on:** `test-hygiene.md` (its leak-safe `suppressWarn` is used by the C3 test) — `[x]`.

## [x] Code

### C2 — `packages/ssr/lib/ssr.ts` `walkChild` switch `default`

Added `default: return "";` so an unrecognized `kind` renders nothing rather than falling through to `resolveValue(child)`. Matches the existing "user-authored isDynamic with no `ssr`" contract (`if (!meta) return "";`).

- [x] `walkChild`'s `switch (meta.kind)` has `default: return "";`. — `packages/ssr/lib/ssr.ts:78`.
- [x] The 4 existing-kind outputs are byte-identical. — `bun coverage ssr` 24/24; existing suite green.

### C3 — `packages/dom/lib/internal/hydrate.ts` `hydrateForEach` mismatch path

Restructured the count-mismatch branch: capture the post-region reference (`after`) **before** removal (the original `current` is detached once its node is removed — `insertBefore` against it would throw `NotFoundError`), remove the partial set, position an anchor at `after`, push an empty ctx, fresh-build at the anchor, return `anchor.nextSibling`. Also added a gather-loop comment documenting the server>client orphan limitation (undetectable without markers).

- [x] `hydrateForEach` mismatch branch captures `after` before removal, positions the anchor at `after` (not parent-end), pushes an empty ctx, calls `child(parent)`, pops, returns `anchor.nextSibling`. — `packages/dom/lib/internal/hydrate.ts:331-341`.
- [x] Gather-loop comment documents the server>client orphan limitation. — `hydrate.ts:320-322`.

### C1 — REVISED: contract doc-note (no Code change)

The `Proxy`-mirror Code fix was rejected (traced duplication — see Scope). Instead documented the unsupported input as a gotcha.

- [x] `packages/ssr/AGENTS.md` Non-obvious behaviors gains the "Reactive getters returning an isDynamic component function are unsupported" bullet (explains `walkChild` stringifies the fn; directs to direct-child or HellaNode-wrapped forms). — `packages/ssr/AGENTS.md:37`.
- [x] `packages/dom/AGENTS.md` `## hydrate` gains the ForEach server>client count-divergence bullet (C3b). — `packages/dom/AGENTS.md:98`.
- [x] **No `mountReactiveAt` Proxy branch added** — the net-negative fix is not in the codebase.

## [x] Tests

- [x] C2 regression: `ssr.test.ts` "renders nothing for an isDynamic function with an unknown ssr kind" — constructs a fn whose body throws, asserts `ssr` returns `"<div></div>"` without calling it. — `packages/ssr/tests/ssr.test.ts`; `bun coverage ssr` 24/24, 100/100.
- [x] C3 regression: `hydrate-foreach.test.ts` "re-mounts a mid-list ForEach mismatch at the cursor preserving trailing siblings" — removes a mid-list item, asserts the list re-mounts (3 lis), AND both leading/trailing siblings are preserved (the pre-fix `return null` lost the cursor, misplacing the fresh list and consuming trailing siblings). — `packages/dom/tests/hydrate-foreach.test.ts`; `bun coverage dom` 302/302.
- [x] ~~C1 regression test~~ — dropped (C1 revised to a doc-note; the input is unsupported, so no behavior to pin via a green test).

## Blast radius

- `mountReactiveAt` untouched (C1 not a code fix). `hydrateForEach` mismatch branch is cold (only on server/client count divergence); the happy adoption path is byte-identical (guarded by the existing adoption tests).
- `walkChild` `default` is additive; the 4 existing kinds unchanged (guarded by `ssr.test.ts`).
- AGENTS.md edits (3 bullets across ssr + dom AGENTS) → the post-commit hook + CI run `bun sync`; never run manually.
- No `nodes.d.ts` change → `bun visibility` clean. `HydrateCtx` remains internal.

## Verification

- [x] `bun coverage dom` green — 302 pass / 0 fail (301 baseline + 1 C3 test).
- [x] `bun coverage ssr` green — 24 pass / 0 fail; 100/100 coverage (C2 test restored the default-line coverage).
- [x] `bun visibility` clean — "✔️ No @internal types found in wholesale-exported type files".
- [x] `rg 'default:' packages/ssr/lib/ssr.ts` shows the new line — verified (`ssr.ts:78`).
- [x] Wrapper tags intact (`<dom-package-instructions>`/`<hellajs-agent>`) — verified; only bullet prose changed.

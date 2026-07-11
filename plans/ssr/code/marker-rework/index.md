# [~] Plan set: SSR + hydration rework — marker-free walk → explicit comment markers (functional change DONE; ssr-comparison.md doc deferred)

## Decision (locked by user, 2026-07-11)

The marker-free cursor-walk hydration design is being **reverted in favor of explicit HTML-comment markers**, matching the industry norm (Vue verified from source this session: `vuejs/core` `packages/server-renderer/src/render.ts` emits `<!--[-->`/`<!--]-->`/`<!---->`; React/Solid/Svelte all use comment markers). The marker-free tax (coalescing rebuild [memory/010], adoption limit [012], undiagnosable ForEach count divergence [C3], ~120 lines of bug-prone cursor inference in `internal/hydrate.ts`) is removed at the root. This is foundational and hard-to-reverse — the plan is sequenced so each unit ships green and the integration is verified last.

## The marker contract (the load-bearing design — confirm before execution)

**Format:** `<!--[-->` (open) / `<!--]-->` (close) — Vue's, verified. The HTML parser turns these into `Comment` nodes with `nodeValue` `[` and `]`; hydrate identifies them by `nodeType === COMMENT_NODE && nodeValue === "[" / "]"`. No data attributes, no encoded payloads — markers delimit extent only (hydrate re-executes the AST, so it already knows each region's *kind* from the tree, not the marker).

**What gets marked (minimal — dynamic/ambiguous regions only):**
- **Reactive children** (non-dynamic function/signal children): `<!--[-->{resolved}<!--]-->`. Solves coalescing (010) — the reactive value is its own text node between markers, never merged with adjacent static text.
- **isDynamic regions** (ForEach / Transition / Portal / Lazy): `<!--[-->{content}<!--]-->`. Solves the adoption limit (012) and ForEach count divergence (C3) — the region's extent is unambiguous.
- **Fragment children** nested among siblings: marked for extent clarity.
- **Static elements**: NOT marked — element-bounded and unambiguous, match by position (keeps payload growth minimal).

**What stays vs goes in dom:**
- STAYS: `HydrateCtx` stack + `peekHydrateContext`/`push`/`pop` (the adoption handoff from walker to ForEach/Transition — the walker reads markers, gathers the region's nodes, seeds them via ctx); `getBoundaryConfig`/`clearRenderedNodes` (shared with mount); `hydrateNode` (attach-to-existing — unchanged shape); the four components' adoption branches (ForEach/Transition read `hctx.existingNodes`).
- GOES: `hydrateSequence`'s text-run classification + coalescing detection; `mountRunBefore`; `mountReactiveAt` (reactive text is now marker-bounded, adopted like any region — no rebuild); `hydrateForEach`'s count-based gather → marker-based gather; the just-made C1 doc-note (the input becomes SUPPORTED — a reactive getter resolving to an isDynamic fn is now a marked, adoptable region); the C3 mismatch-path fix (count divergence is now marker-detectable).

**Net:** `internal/hydrate.ts` ~388 → ~285 lines; the deleted ~100 are exactly the bug-prone inference logic. `ssr.ts` gains ~15 lines of marker wrapping. Net code change negative; net capability positive (unlocks future streaming/islands).

## Shared scope

Three units, tightly coupled by the marker contract but **sequenced so each ships green independently**:

- **Unit 1 (ssr)**: emit markers. After it: ssr tests green (marker output); dom green (dom's hydrate tests use `serverContainer`/manual `innerHTML` — mount-based, no markers in their input — so they don't see the change). Contract temporarily inconsistent (ssr emits markers, dom ignores them) but no test fails.
- **Unit 2 (dom)**: read markers. After it: dom hydrate tests green (rewritten to inject `<!--[-->…<!--]-->` into their server HTML); ssr still emits markers (Unit 1) → contract consistent.
- **Unit 3 (integration + docs + memory)**: `bun install` to link `@hellajs/ssr` (fixes memory/011); add the first real ssr→hydrate integration test; fix `dom-comparison.md`'s falsified "SSR gap" claim; generate `ssr-comparison.md`; supersede memory 009/010/012.

## Boundary guardrails (set-level)

- **core / css / resource / router / store** untouched.
- **`SsrMeta` descriptor stays** — ssr still dispatches on `fn.ssr.kind` to render each component's inner content; it just wraps the result in markers.
- **`ssr()` output is a BREAKING change** — markers in the HTML. Changeset = major bump for `@hellajs/ssr` + `@hellajs/dom` (hydrate's server-HTML contract changes).
- **`RenderFn` public signature unchanged** — adoption still threaded via the internal `HydrateCtx` stack, not a new param.
- **Zero runtime imports** (`@hellajs/ssr`) preserved — markers are strings.

## Relationship to the just-completed hydration-audit

- **Unit 1 (test-hygiene / `suppressWarn`)** — **STAYS** (good regardless of walker).
- **C2 (ssr switch `default`)** — **STAYS** (defensive; still correct).
- **C1 (doc-note: reactive-getter-returning-isDynamic unsupported)** — **SUPERSEDED** by Unit 2 (the input becomes a marked, adoptable region → supported).
- **C3 (ForEach mismatch cursor fix)** — **SUPERSEDED** by Unit 2 (marker-based gather replaces count-based gather).
- **C6 (resource doc precision)** — **STAYS** (unrelated to markers).

## Units

- [x] **[`01-ssr-markers.md`](./01-ssr-markers.md)** — ssr emits `<!--[-->…<!--]-->` around dynamic regions + `renderDynamic` (C1 fix). No deps. **DONE.**
- [x] **[`02-dom-hydrate-reader.md`](./02-dom-hydrate-reader.md)** — dom hydrate reads markers; `mountReactiveAt`/`mountRunBefore`/count-gather DELETED; ForEach count-strict; `ssrContainer` (real ssr) replaces `serverContainer`. `depends_on: [01-ssr-markers]`. **DONE.**
- [~] **[`03-integration-docs-memory.md`](./03-integration-docs-memory.md)** — link ssr (`bun install`), ssr→hydrate integration test (C1 end-to-end ✓), dom-comparison fix, memory (013 supersedes 009; 010/011/012 RESOLVED), major changeset. **`packages/ssr/ssr-comparison.md` deferred** (TARGETS prepped) — a focused comparison-skill pass. `depends_on: [01-ssr-markers, 02-dom-hydrate-reader]`.

## Verification gates (set-level)

- `bun coverage ssr` green after Unit 1 (marker output asserted).
- `bun coverage dom` green after Unit 2 (hydrate tests rewritten for marker input).
- `bun coverage` (full) green after Unit 3; integration test passes.
- `bun visibility` clean (no new public types leak).

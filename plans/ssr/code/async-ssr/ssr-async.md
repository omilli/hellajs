# [ ] Add `ssrAsync` — async-await SSR walker

## Scope
- **Gap**: `ssr(node): string` is synchronous — `resolveValue` calls each getter once and the walker cannot await a `Promise`. A component needing server-fetched data must pre-load at the call site and pass resolved values; there is no way to express "this subtree awaits a fetch" *in the tree*. Add a parallel async walker that awaits any `Promise` a resolved getter/child/`bind:`/`each`/`show` returns, returning `Promise<string>`. Every dynamic region is still wrapped in `<!--[-->…<!--]-->` markers, so `hydrate` is **unchanged** — it receives a complete string.
- **Surface**: yes — new export re-exported by `packages/ssr/lib/index.ts`. → Code + Tests + Docs, one atomic unit.
- **Type**: Code + Tests + Docs.
- **Invariant preserved**: zero runtime imports from any `@hellajs/*` package — awaiting a `Promise` needs no import; the type-only `HellaNode`/`HellaChild`/`SsrMeta` import stays erased. Verified the existing `ssr.ts` has zero `async`/`await`/`Promise` (pure sync); the async walker adds `await` only.

## Decisions (load-bearing — overridable at approval)

1. **Export name → `ssrAsync`.** Terse, parallel to `ssr`, matches HellaJS naming. Alternative considered: `renderToStringAsync` (Solid's name, industry-recognizable) — rejected for consistency with the existing terse `ssr`.
2. **Scope of "async" → generic Promise-await ONLY.** Any resolved value (child, `bind:`, `each`, `show`) that is a `Promise` is awaited (JS `await` unwraps thenable chains, so nesting is handled). **`Lazy` unchanged** (`Lazy.ts:56` `fn.ssr = { kind: "lazy" }`; loader called client-side only at `Lazy.ts:37`; server renders `loading`) — it is a client-progressive primitive. **`resource` unchanged** (`resource.ts:175` `if (!hasWindow()) return;` — server no-op) — it is a reactive UI primitive. Users express server-async directly via a getter/child returning a `Promise`. Rationale: minimal, invariant-preserving, zero cross-package changes. Wiring `Lazy`/`resource` to be server-awaitable is a separate follow-up surface change, not part of A.
3. **Walker strategy → separate async walker, not a shared parameterized one.** Sync `ssr` stays the optimal zero-Promise-overhead fast path (the praised ~1.15 KB default). The async walker (`ssrAsync` + async `walkChildAsync`/`walkChildrenAsync`/`renderDynamicAsync`) mirrors the sync structure with `await`. Module-level helpers (`escapeText`, `serializeProp`, `VOID`, `MARK_OPEN`/`MARK_CLOSE`, `resolveValue`) are reused. A parameterized walker was rejected — it would pull Promise machinery into the sync hot path and add abstraction the package currently avoids (single file, no `internal/`). Drift risk between the two walkers is mitigated by a parity test (DoD).
4. **Errors → propagate.** A rejected `Promise` throws to the caller (await re-throws) — matches sync `ssr`'s "no try/catch, errors propagate." No fallback UI in A (fallback/`loading` for unresolved subtrees is a B+C/Suspense concern; under pure await everything resolves before output, so a fallback would never render).
5. **Markers → identical to sync `ssr`.** An awaited reactive child still produces one `<!--[-->…<!--]-->` region. `hydrate` is unchanged.

## [ ] Code
Files: `packages/ssr/lib/ssr.ts` — add `ssrAsync` + async walk helpers alongside the existing sync code.
Delta: `export async function ssrAsync(node: HellaNode): Promise<string>` — an async mirror of `ssr`: `walkChildAsync` resolves a function child via `resolveValue`, and if the result `isPromise` (a `thenable`), `await`s it (one `await` unwraps nested thenables), then classifies exactly as the sync path does (escaped text / recurse `ssrAsync` / `renderDynamicAsync`). `renderDynamicAsync` mirrors `renderDynamic`: `forEach` awaits a Promise `each`; `transition` awaits a Promise `show` then truthy-checks; `portal`/`lazy` unchanged. `isPromise(v)` helper = `v !== null && typeof v === "object" && typeof (v as { then?: unknown }).then === "function"`. Marker wrapping is byte-identical to sync.
Runnable usage: `await ssrAsync(html\`<p>${() => fetch(url).then(r => r.text())}</p>\`).

Files: `packages/ssr/lib/index.ts` — add `export { ssrAsync } from "./ssr";` next to the existing `ssr` export.
Delta: one line, preserves the existing `ssr` export.

Strategy: The async walker is a structural clone of the sync one with `await` at the resolve step. Keep the sync `ssr`/`walkChild`/`walkChildren`/`renderDynamic` byte-for-byte unchanged (the fast path is the product). Reuse every module-level helper. The only new helper is `isPromise`. No runtime imports added.

- [ ] `ssrAsync(node)` returns a `Promise<string>`; for a tree with no Promises, `await ssrAsync(tree) === ssr(tree)` (parity).
- [ ] A `Promise`-returning child getter is awaited and its value escaped/placed inside one `<!--[-->…<!--]-->` region.
- [ ] A `Promise`-returning `bind:` value is awaited and serialized via `serializeProp`.
- [ ] A `Promise`-returning ForEach `each` is awaited, then items mapped through `use` and rendered in one marker region.
- [ ] A `Promise`-returning Transition `show` is awaited, then truthy-gates `children`.
- [ ] A `Promise` resolving to a HellaNode is recursed via `ssrAsync` (inside its marker region).
- [ ] Nested thenables (Promise resolving to a Promise) resolve fully via one `await`.
- [ ] A rejected `Promise` propagates to the caller (await re-throws; no try/catch added).
- [ ] Sync `ssr` and its helpers are byte-for-byte unchanged (diff isolates the additions).
- [ ] `index.ts` re-exports `ssrAsync`; `ssr` export unchanged.

## [ ] Tests
Files: `packages/ssr/tests/ssr-async.test.ts` (new). Import `ssrAsync`/`ssr` from `@hellajs/ssr/bundle`; build nodes with `html`/`ForEach`/`Transition` from `@hellajs/dom/bundle`; `signal` from `@hellajs/core`. No `resetTestState` (pure data, like the existing `ssr.test.ts`). Run via `bun coverage ssr`.

- [ ] `await ssrAsync(html\`<div>hi</div>\`)` resolves to `"<div>hi</div>"` (basic sync parity).
- [ ] `await ssrAsync(html\`<p>${() => Promise.resolve(5)}</p>\`)` → `"<p><!--[-->5<!--]--></p>"` (Promise child, marker-bounded).
- [ ] `await ssrAsync(html\`<p>${() => Promise.resolve("<b>")}</p>\`)` → escaped `&lt;b&gt;` inside the region.
- [ ] `await ssrAsync(html\`<input bind:value=${() => Promise.resolve("x")} />\`)` → `<input value="x">`.
- [ ] `await ssrAsync(ForEach-with-Promise-each)` → items rendered in one marker region, array order.
- [ ] `await ssrAsync(Transition-with-Promise-show-true)` → child in a region; `show` Promise resolving falsey → empty region.
- [ ] `await ssrAsync(html\`<div>${() => Promise.resolve(html\`<b/>\`)}</div>\`)` → `<div><!--[--><b></b><!--]--></div>` (Promise resolving to a HellaNode).
- [ ] Nested thenable: `Promise.resolve(Promise.resolve(1))` → `<!--[-->1<!--]-->`.
- [ ] Rejection propagates: `await ssrAsync(html\`<p>${() => Promise.reject(new Error("boom"))}</p>\`)` throws `"boom"`.
- [ ] Parity drift guard: for a suite of non-Promise trees (static, signal child, ForEach, Transition, Portal, Lazy, component), `await ssrAsync(t) === ssr(t)` for each.
- [ ] `Lazy` scope pin: `Lazy` with a loader + `loading` under `ssrAsync` renders `loading` (loader NOT awaited) — pins Decision 2.

## [ ] Docs
Files (new — per `guides/docs.md` §Extending "new standalone export → new file + wrapper"):
- `packages/ssr/docs/api/ssr-async.mdx` (new, Function doc template): `# ssrAsync`; one-line description; `## API` signature `function ssrAsync(node: HellaNode): Promise<string>`; `## Basic Usage` with a fetch-in-tree example (imports `ssrAsync` from `@hellajs/ssr`, `html` from `@hellajs/dom`); `## Key Concepts` — awaits any Promise a resolved value returns; markers identical to `ssr` so `hydrate` is unchanged; errors propagate; `## Important Considerations` — `Lazy`/`resource` unchanged (fetch directly / return a Promise getter); prefer sync `ssr` when no async data (zero Promise overhead).
- `docs/src/pages/reference/ssr/ssr-async.mdx` (new website wrapper): frontmatter `title`/`description`/`layout`, `import SsrAsyncContent from '@ssr/api/ssr-async.mdx'`, zero prose.

Files (extend existing):
- `packages/ssr/docs/index.mdx` — add `ssrAsync` to the `### API` bullet list.
- `packages/ssr/docs/concepts/ssr.mdx` — note that async data resolution is available via `ssrAsync` (one sentence + cross-reference), under the existing model description.
- `packages/ssr/docs/patterns/ssr.mdx` — add a `### Async data fetching` pattern (fetch inside the tree, `await ssrAsync(...)`), self-contained with imports.

Files (surface inventory + enumerations — Phase 5):
- `packages/ssr/AGENTS.md` — add `ssrAsync` row to the Public exports table; add a one-line Architecture note on the async walker (mirrors sync, awaits Promises, reuses helpers, markers identical). [Post-commit hook regenerates `CLAUDE.md`; do not run `bun sync` manually.]
- `packages/ssr/README.md` — add `ssrAsync` to the API list if present (verify first).
- `docs/src/nav.ts` — register `ssrAsync` under the `reference/ssr` group.
- Enumeration pages — grep the site for the `ssr` reference enumeration and add `ssrAsync` where `ssr` is listed (`docs/src/pages/reference/index.mdx` and any `learn/` index that enumerates ssr exports).

Strategy: Follow `guides/docs.md` — Function doc template for `ssr-async.mdx`; no frontmatter on package docs; frontmatter on the wrapper; `typescript`/`js` language tags; package imports (`@hellajs/ssr`, `@hellajs/dom`); present tense, no hedging; cross-reference [`ssr`](/reference/ssr/ssr) and [`hydrate`](/reference/dom/hydrate) on first mention. The Basic Usage example IS the Code delta's runnable call.

- [ ] `ssr-async.mdx` created, Function doc template, signature + Basic Usage + Key Concepts + Important Considerations, no frontmatter.
- [ ] Website wrapper `reference/ssr/ssr-async.mdx` created with frontmatter + import, zero prose.
- [ ] `index.mdx` API bullet lists `ssrAsync`.
- [ ] `concepts/ssr.mdx` notes `ssrAsync` with a cross-reference.
- [ ] `patterns/ssr.mdx` has an `### Async data fetching` pattern, self-contained with imports.
- [ ] `packages/ssr/AGENTS.md` Public exports table + Architecture note updated for `ssrAsync`.
- [ ] `README.md` API list updated (if it enumerates exports).
- [ ] `docs/src/nav.ts` registers `ssrAsync`.
- [ ] Every site enumeration listing `ssr` also lists `ssrAsync` (grep-verified, no stale enumeration).

## Definitions of Done (aggregate gates)

- [ ] `bun coverage ssr` green — bundle + tests + lint + typecheck; the new test file passes; coverage on the async walker lines.
- [ ] `bun dead-exports` clean — `ssrAsync` has value-position references in tests + docs (not dead).
- [ ] Docs-guide checklist (`guides/docs.md`) passes for every touched/created `.mdx`.
- [ ] Zero runtime imports added to `lib/ssr.ts` (the `import type` line is still the only `@hellajs/*` import; `await`/`Promise` need no import) — invariant preserved.
- [ ] Sync `ssr` behavior unchanged — existing `ssr.test.ts` (33 tests) still green byte-for-byte.
- [ ] `hydrate` needs no change — markers are identical (an awaited region is still one `<!--[-->…<!--]-->` pair); no `packages/dom` edit required for A.

## Blast radius
- `packages/ssr`: `lib/ssr.ts`, `lib/index.ts`, `tests/ssr-async.test.ts` (new), `docs/api/ssr-async.mdx` (new), `docs/concepts/ssr.mdx`, `docs/patterns/ssr.mdx`, `docs/index.mdx`, `AGENTS.md`, `README.md`.
- `docs/src`: `pages/reference/ssr/ssr-async.mdx` (new wrapper), `nav.ts`, `reference/index.mdx` (+ any `learn/` enumeration listing ssr).
- `packages/dom`: **unchanged** (hydrate unchanged; no new primitive under minimal A — Decision 2).
- `packages/resource`: **unchanged**.
- No new dependencies. Zero-runtime invariant preserved. Non-breaking new export → minor bump (`@hellajs/ssr` 1.0.0 → 1.1.0). Changeset created manually, NOT in this plan's DoD.
- Hand-off to B/C: A's async walker is the foundation B (streaming response) and C (streaming/selective hydration) extend. After A lands, `brain-idea` resolves C's design forks (suspense-segment marker contract, late-arriving segment adoption in `hydrate`, abort/timeout, composition with ForEach/Lazy/Transition under partial hydration) before `brain-plan` for B/C.

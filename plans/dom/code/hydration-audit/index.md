# [x] Audit plan set: SSR + hydration — quality, performance, industry-fit review

## Why this set exists

Post-build review of the SSR + hydration feature (`@hellajs/ssr` v1 + `hydrate()` in `@hellajs/dom`). Two reviews ran:

- **`brain-audit`** — rule-grounded findings (each a quoted `guides/*.md` rule or a runnable check).
- **`brain-critic`** — judgment findings (each a named cost: Breaks / Hampers / Misleads / Bloats).

The actionable findings are packaged as fix contracts below. The non-actionable assessment (industry-fit, the deliberate marker-free design, the deferred DRY fork) lives in this index so the decision context is preserved alongside the fixes.

## Baseline (verified this session)

- `bun coverage ssr` → EXIT 0; 23/23 pass; 100/100 coverage.
- `bun coverage dom` → EXIT 0; 301/301 pass; 99.42/99.41% (uncovered = defensive mismatch/error-catch branches in `internal/hydrate.ts` + the async-unmount-before-attach path in `hydrate.ts`).
- `bun coverage resource` → EXIT 0; 190/190 pass; 99.76%.

## Findings register (severity-sorted)

### brain-audit (rule-grounded)

| ID | Severity | Rule | Violation |
|---|---|---|---|
| A1 | should-fix | `guides/tests.md` Anti-Patterns: "Never repeat a helper across files — extract"; Verification Checklist: "No helper duplicated across files — extracted to `tests/helpers.ts`" | `suppressWarn()` is defined verbatim in BOTH `packages/dom/tests/hydrate.test.ts:7` and `packages/dom/tests/hydrate-foreach.test.ts:7`. |
| A2 | should-fix | `guides/tests.md` §Patched browser globals: "must capture the original in `beforeEach` and restore in `afterEach`, or wrap the body in `try { ... } finally { restore(); }`. A trailing restoration assignment is unacceptable." | The local `suppressWarn()` is used as `const c = suppressWarn(); …; c.restore();` (no try/finally) in 3 test bodies (`hydrate.test.ts`: "warns and re-mounts when a server element is missing", "warns and subtree-replaces on a tag mismatch"; `hydrate-foreach.test.ts`: "falls back to re-mount on a ForEach count-mismatch"). A failing assertion before `restore()` leaks a stubbed `console.warn` into later files. |
| A3 | nit | `guides/code.md` §File and Function Size: "Files: soft limit under 300 lines." | `packages/dom/lib/internal/hydrate.ts` is 388 lines. Cohesive single concern (hydration walk) — the guide permits exceeding "when the alternative (splitting) would harm clarity." Listed for completeness; no split recommended unless C4/C5 land. |

### brain-critic (judgment — each clears the cost gate)

| ID | Severity | Lens / Cost | Finding |
|---|---|---|---|
| C1 | **Major** | Correctness / **Breaks** | `mountReactiveAt` (`packages/dom/lib/internal/hydrate.ts`) omits the isDynamic-resolved branch that `appendToParent` (`packages/dom/lib/internal/render.ts:198-215`) has. A reactive child that resolves to an isDynamic component hydrates WRONG. **Resolved as a contract doc-note, not a code fix** — the planned `Proxy` mirror was traced to duplicate server nodes; the input is itself unsupported by `ssr` (which stringifies the bare `RenderFn`). See `hydrate-correctness.md`. |
| C2 | Minor | Correctness / **Breaks** (latent) | In `ssr.ts` `walkChild`, the `isDynamic` `switch (meta.kind)` has no `default`. If a future `kind` is added without a case, execution falls through (the switch is not the last statement in its block) to `const resolved = resolveValue(child)` — which calls the `RenderFn` with no parent. Unreachable today (only 4 kinds exist, set by the 4 components), but a latent hole; an exhaustive switch with no `default` that isn't terminal is fragile. |
| C3 | Minor | Correctness / **Breaks** (edge) | `hydrateForEach` (`internal/hydrate.ts`) has two mismatch-path gaps: (a) count-mismatch re-mount returns `null`, losing the DOM cursor — siblings after a mismatched ForEach misalign; (b) the gather loop `while (node && existing.length < count)` stops at exactly `count`, so when the server rendered MORE nodes than the client signal holds, the extras are orphaned in the DOM with no `warn`. The client<->server item-count divergence is itself a bug, but silent orphaning makes it undiagnosable. |
| C4 | Minor | Complexity / **Hampers** | `packages/dom/lib/hydrate.ts` clones `mount.ts`'s resolve + async-detect + `flush` + `unmount` + `attach` skeleton (~80 near-parallel lines). The build plan justifies this on cold(hydrate)/hot(mount) separation (`guides/code.md` Decision Precedence: Performance). Cost: any change to `mount`'s handle shape (flush semantics, unmount cleanup, async routing) must be mirrored in `hydrate` or the two drift. |
| C5 | Minor | Complexity / **Hampers** | `mountRunBefore` + `mountReactiveAt` (`internal/hydrate.ts`) partially duplicate `appendToParent`'s reactive-child effect (minus the Proxy branch — see C1). Three near-parallel reactive-child implementations now coexist. |
| C6 | Minor | API / **Misleads** | `packages/resource/docs/api/resource.mdx` + `packages/ssr/AGENTS.md` state "resource no-ops on the server," but only `run()` is guarded by `hasWindow()` (`packages/resource/lib/resource.ts`). `mutate()` is NOT guarded — a server-side `r.mutate(...)` proceeds to fetch. Defensible (mutate is user-initiated, not render-time), but the blanket "no-ops" claim is imprecise. |

## Units

- [x] **[`test-hygiene.md`](./test-hygiene.md)** — A1 + A2: extract `suppressWarn` into `tests/helpers.ts` (save/restore-safe) and delete both local copies. No `depends_on`.
- [x] **[`hydrate-correctness.md`](./hydrate-correctness.md)** — C2 (ssr switch `default`) + C3 (ForEach-mismatch cursor/position); **C1 revised** from a `Proxy`-mirror Code fix to a contract doc-note after tracing showed the mirror duplicates server nodes. Depends on test-hygiene.
- [x] **[`resource-doc-precision.md`](./resource-doc-precision.md)** — C6: tighten the resource "no-ops on the server" claim to scope `run()` (or guard `mutate()` — design fork resolved in-unit). No `depends_on`.

## Deferred / no-action

- **C4/C5 (mount↔hydrate skeleton + reactive-child DRY).** The duplication is a deliberate, performance-justified design documented in the build plan. Merging is a design fork (shared `mountOrHydrate` core, or a parameterized reactive-child helper) with hot-path risk — out of scope for a fix contract until the divergence it would prevent actually bites. Re-evaluate if mount's handle shape changes. Hand to `brain-idea` if pursued.
- **A3 (`internal/hydrate.ts` 388 lines).** Splitting harms clarity (one cohesive walk). Leave unless C4/C5 land and force a natural seam.
- **Coverage gaps** (defensive mismatch branches at `dist/bundle.js:551-552/573-574`, async-unmount-before-attach at `1364-1365`, `hydrateDynamic` default at `723-724`). Acknowledged in the build plan DoD as "defensive error-catch blocks + edge paths." Unit 2 adds tests for the `hydrateDynamic` default + a non-static tag-mismatch as part of C1/C3 coverage.

## Industry-fit assessment (the "is this built the standard way?" answer)

**Standard & sound.**

- Pure SSR stringifier with zero runtime `@hellajs/*` imports — matches Solid's isomorphic split (`renderToString` with no client runtime). Type-only `HellaNode`/`SsrMeta` imports erase at compile time; verified: `rg '^import \{' packages/ssr/lib` shows only `import type`.
- `hydrate()` = attach effects/handlers/state to existing DOM, never `replaceChildren` — matches React `hydrateRoot`, Solid `hydrate`, Vue `createSSRApp`. The `hydrate.ts` invariant test ("preserves server DOM across hydrate") pins the core contract.
- Mismatch → `console.warn` + subtree-replace — matches React's warn-and-client-render philosophy (HellaJS re-mounts the offending subtree rather than patching node-by-node; simpler and defensible).
- Keyed-list adoption via `HydrateCtx` stack — reuses ForEach's own LIS reconciliation seeded from adopted nodes. One source of truth for key resolution; no parallel re-implementation (the build plan explicitly rejected that as drift-prone).
- Escaping is **correct and XSS-safe** for normal flow content: `escapeText` covers `& < > "`; `serializeProp` always emits double-quoted values (`key="…"`) so attribute breakout is impossible; tag names are template-static (never interpolated); `SKIP_REGEX` strips comments. The `VOID` set is the complete HTML void-element list.
- `resource` server-guard via `hasWindow()` — standard "don't fetch during SSR" (cf. SWR/TanStack Query SSR no-op).

**One deliberate divergence worth knowing (NOT a bug, NOT industry-norm).**

- **No hydration markers in the shipped HTML.** React/Vue/Solid emit comment markers / `data-*` attributes to locate hydration boundaries. HellaJS ships clean HTML and matches by a **structural cursor walk** (`hydrateSequence`). Trade-off: smaller payload + cleaner view-source, but fragile for **coalesced reactive text** (server merges adjacent text into one node; client separates them) — which is exactly why the text-run rebuild machinery (`mountRunBefore`/`mountReactiveAt`) exists. The design is legitimate and documented (`memory/entries/010.md`), but it is the single largest "this is not how the mainstream does it" point. The cost is the rebuild complexity + C1's divergence surface; the benefit is zero marker overhead.

**v1 scope gaps vs current trends (acceptable, not red flags).**

- No streaming SSR — `ssr()` returns one string. React/Solid/Svelte stream. Fine for v1; note for a future streaming node.
- No dedicated island primitive — islands are composed via `mount(Island, "#empty-slot")` + `$ref`/`$collection`. The islands architecture is reachable; it just isn't a first-class `island()` export.

**Security red flags: none.** Escaping sound; attribute injection blocked; tag injection impossible; comment injection stripped. The only escaping nuance is RAWTEXT/RCDATA elements (`<script>`/`<textarea>`/`<style>`/`<title>`) where entity escaping is semantically wrong — a known SSR edge case, not exercised by the public `html` surface for interpolation into those tags (interpolated children route through `walkChild`'s escaped text path; a `<script>` body would be a static template literal, not interpolated). Worth a one-line doc note if `ssr` ever documents rawtext-element interpolation.

**Overall verdict.** The feature is well-architected for its chosen model (marker-free, cursor-walk hydration over a zero-runtime stringifier). The one real correctness gap is C1 (mount/hydrate divergence on isDynamic-resolved reactive children) — the rest are hardening, DRY-acknowledged trade-offs, and doc precision. No glaring red flags; the marker-free choice is the thing to consciously own.

## Verification gates (set-level)

- `bun coverage ssr` green (Unit 2 touches `lib/ssr.ts`).
- `bun coverage dom` green (Units 1 + 2 touch dom tests + `lib/internal/hydrate.ts`).
- `bun coverage resource` green (Unit 3 touches resource docs/guard).
- `bun visibility` clean (Unit 2 must not leak a new `@internal` type into `nodes.d.ts`).

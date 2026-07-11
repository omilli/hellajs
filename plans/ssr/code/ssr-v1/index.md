# [x] Plan set: @hellajs/ssr v1 — pure stringifier

## Shared scope

Ship `@hellajs/ssr` v1: `ssr(node): string` — a pure HellaNode→HTML stringifier with **zero runtime imports** from any `@hellajs/*` package (type-only `HellaNode`/`SsrMeta` imports, erased). `@hellajs/resource` guards `run()` with `hasWindow()` (zero new API). **core untouched. css untouched** (css's server story lives in `plans/css/code/platform-return.md`). v1 client enhances shipped HTML via `$ref`/`$collection` + `mount(Island, "#empty-slot")` islands — no hydrate mode (see `../hydration-design.md`).

## Resolved fork — why this is a set, not one file

The original single-file plan assumed the SSR walk could render `ForEach`/`Transition`/`Portal`/`Lazy` by "resolving function children to current values." It cannot. Those four are the only producers of `isDynamic` render functions, and each returns an **opaque closure** whose props are trapped inside:

- `packages/dom/lib/ForEach.ts:249`, `Transition.ts:82`, `Portal.ts:60`, `Lazy.ts:53` — `fn.isDynamic = true; return fn;` (nothing else exposed).
- `packages/dom/lib/types/nodes.d.ts:127` — `RenderFn = ((element) => void) & { isDynamic: true }` (no extension point).
- `packages/dom/lib/internal/template.ts:106-108` — for any `isDynamic` component, the parser calls `componentFn(resolvedProps)` and embeds the returned closure; the props are gone by the time SSR sees the tree.

Calling the closure needs a real DOM `Element` and `document`; a pure stringifier has neither. So scenarios 8–13 (ForEach/Transition/Portal/Lazy) are **impossible** unless dom exposes the props.

**Resolution A (chosen)** — dom tags each isDynamic function with an `ssr` descriptor `{ kind, props }`; ssr's walk switches on `kind` and re-implements each component's render-to-string. dom stays DOM-only (it only tags data it already holds); ssr owns all serialization; ssr keeps zero runtime imports (reads a property, imports `SsrMeta`/`HellaNode` **type-only**). This matches the plan's own stated principle: *"Serialization is reimplemented, not imported."*

**Rejected:**
- **B** — dom attaches an `fn.ssr()` method per component. Couples dom (currently DOM-only) to string rendering and scatters serialization logic across both packages; violates "reimplemented, not delegated."
- **C** — drop scenarios 8–13. Ships an SSR that silently blanks lists/transitions/lazy content — near-useless for real apps (every app has lists) and a footgun worse than no SSR.

## Units

- [x] **[`dom-ssr-meta.md`](./dom-ssr-meta.md)** — dom exposes `ssr` (`{ kind, props }`) on the four isDynamic components + exports the `SsrMeta` type. **DONE** — `bun coverage dom` green (270 pass, coverage at baseline); type-only, no mount behavior change. Unblocks Unit 2.
- [x] **[`ssr-package.md`](./ssr-package.md)** — the `@hellajs/ssr` package (`ssr` + `internal/walk` + `internal/serialize`), resource `hasWindow` guard, full docs + learn surface, root/packages AGENTS sync. **DONE** — `bun coverage ssr` 100/100, `bun coverage resource` green, full `bun coverage` 1112 pass / 0 fail.

## Boundary guardrails (set-level)

- **core untouched** — `git diff packages/core` empty.
- **css untouched** — css changes live in `plans/css/code/platform-return.md`.
- **dom IS modified** — by `dom-ssr-meta.md` ONLY (adds the type-only `SsrMeta` + optional `RenderFn.ssr` field; four one-line `fn.ssr = { kind, props }` assignments; zero mount-time behavior change).
- **ssr has ZERO runtime imports from `@hellajs/*`** — the `import type` lines are erased at compile time.
- **resource** — one-line guard, no new export, no API change.

## Verification gates (set-level)

- `bun coverage dom` green (Unit 1).
- `bun coverage ssr` green, `bun coverage resource` green (Unit 2).
- No existing core/dom/resource/css/router/store test breaks.

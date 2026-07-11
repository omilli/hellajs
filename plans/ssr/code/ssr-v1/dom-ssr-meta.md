---
depends_on: []
---
# [x] Unit 1 — dom exposes SSR metadata on isDynamic components

## Scope

- **Gap:** `ForEach`/`Transition`/`Portal`/`Lazy` return opaque `isDynamic` closures whose props are trapped inside (`fn.isDynamic = true; return fn;`). A pure stringifier cannot introspect them, so SSR cannot render lists/transitions/portals/lazy content. Target state: each returned function carries an `ssr` descriptor (`{ kind, props }`) so an external stringifier can render it without DOM access.
- **Surface: yes** — adds the exported type `SsrMeta` and an optional `ssr` field on the exported `RenderFn` type (consumed type-only by `@hellajs/ssr`).
- **Type:** Code + Tests + Docs (atomic — Surface:yes).
- **Why this unit exists:** unresolved fork in the original plan — see [`index.md`](./index.md). Prerequisite for `ssr-package.md` scenarios 8–13.

## [x] Code

**Files:**

| File | Anchor | Change |
|---|---|---|
| `packages/dom/lib/types/nodes.d.ts` | after the `RenderFn` definition (~line 127) | Add `SsrMeta` interface; extend `RenderFn` with optional `ssr?: SsrMeta`. |
| `packages/dom/lib/ForEach.ts` | before `return fn;` (~line 249) | `fn.ssr = { kind: "forEach", props };` |
| `packages/dom/lib/Transition.ts` | before `return fn;` (~line 82) | `fn.ssr = { kind: "transition", props };` |
| `packages/dom/lib/Portal.ts` | before `return fn;` (~line 60) | `fn.ssr = { kind: "portal", props };` |
| `packages/dom/lib/Lazy.ts` | before `return fn;` (~line 53) | `fn.ssr = { kind: "lazy", props };` |
| `packages/dom/lib/index.ts` | type re-export block | Verify `SsrMeta` is reachable via the existing `export type * from "./types/nodes";`. If yes → no edit. If not → add an explicit `export type { SsrMeta }`. |

**Delta:**

```ts
// packages/dom/lib/types/nodes.d.ts
/**
 * SSR rendering descriptor attached to isDynamic components.
 * Consumed type-only by @hellajs/ssr; carries the resolved props so a pure
 * stringifier can render ForEach/Transition/Portal/Lazy without DOM access.
 */
export interface SsrMeta {
  /** Which isDynamic component produced this function. */
  kind: "forEach" | "transition" | "portal" | "lazy";
  /** The resolved props object the component received (ForEachProps / TransitionProps / PortalProps / LazyProps). Typed `object` because TS interfaces aren't assignable to `Record<string, unknown>` without an index signature; the consumer (`@hellajs/ssr`) casts to index it. */
  props: object;
}

export type RenderFn = ((element: HellaElement) => void) & { isDynamic: true; ssr?: SsrMeta };
```

```ts
// One uniform line per component, inserted before `return fn;`,
// where `props` is the component's already-received props parameter:
fn.ssr = { kind: "forEach", props };     // ForEach.ts  (props: ForEachProps<T>)
fn.ssr = { kind: "transition", props };  // Transition.ts
fn.ssr = { kind: "portal", props };      // Portal.ts
fn.ssr = { kind: "lazy", props };        // Lazy.ts
```

**Strategy:** dom stays "dumb" — it only tags each isDynamic function with its kind and the resolved `props` object it already holds in scope. All string-rendering logic lives in ssr (Unit 2), preserving the plan's "serialization is reimplemented in ssr, not imported" principle and keeping dom DOM-only. The field is **optional** so any user-authored isDynamic fn (none in the public API, but possible) simply renders as nothing in SSR rather than throwing. `props` is the full resolved props object — ssr reads `.each`/`.use`/`.show`/`.children`/`.loading` as needed; keys are never needed (per `../hydration-design.md` Option C). One uniform line per component — no per-kind branching in dom.

**DoD:**

- [x] `SsrMeta` interface added to `nodes.d.ts`; `RenderFn` extended with optional `ssr?: SsrMeta`. — `packages/dom/lib/types/nodes.d.ts`; `tsc -p tsconfig.lint.json` EXIT 0.
- [x] `SsrMeta` reachable as a type export from `@hellajs/dom` (via existing `export type *` or an explicit re-export). — covered by `export type * from "./types/nodes"` in `lib/index.ts`; no index.ts edit needed; tsc resolves it.
- [x] ForEach/Transition/Portal/Lazy each attach `fn.ssr = { kind, props }` before returning. — all four edited; `ssr-meta.test.ts` asserts each `kind`.
- [x] No mount-time behavior change — `ssr` is write-only at mount; existing dom tests stay green. — `bun coverage dom`: 270 pass / 0 fail (baseline was 266 / 0).
- [x] `packages/dom/lib/` introduces NO new runtime import (the change is a field assignment + a type). — assignments use in-scope `props`; eslint + tsc EXIT 0.

## [x] Tests

**Files:** `packages/dom/tests/ssr-meta.test.ts` (new). Surface = the SSR metadata contract.

```ts
import { describe, test, expect } from "bun:test";
import { html, ForEach, Transition, Portal, Lazy } from "@hellajs/dom/bundle";
```
**No `beforeEach(resetTestState())`** — construction of these components is pure (effects/global maps register at *mount*, not construction), so the file touches zero shared mutable state; `guides/tests.md` says skip `resetTestState()` for such files. **No `import type`** — the returned function is typed `JSX.Element` (= `HellaNode & RenderFn`), so `fn.ssr` is inferred; no annotations needed (avoids unused-import lint). `describe("dom") > describe("ssr meta")`, 4 tests reading `fn.ssr` directly. Dropped the planned "all four keep isDynamic" scenario as redundant — `isDynamic` is already asserted inside each of the 4 component tests (one behavior, tested at each distinct `fn.isDynamic = true` site).

- ForEach → `test("ForEach attaches ssr with kind forEach and each/use props", ...)`
- Transition → `test("Transition attaches ssr with kind transition and show/children props", ...)`
- Portal → `test("Portal attaches ssr with kind portal and to prop", ...)`
- Lazy → `test("Lazy attaches ssr with kind lazy and loader/loading props", ...)`

**DoD:**

- [x] File exists, surface-named `ssr-meta.test.ts`; import order `bun:test` → `@hellajs/dom/bundle`; no `beforeEach` (zero shared state — guide) and no `import type` (`JSX.Element` inference) — both guide-compliant.
- [x] All 4 scenarios pass. — `bun coverage dom`: `dom > ssr meta >` 4/4 ✓.
- [x] `bun coverage dom` green — 270 pass / 0 fail; coverage 99.32/99.93 (== baseline, not below).

## [x] Docs

**Files:**

| File | Change |
|---|---|
| `packages/dom/AGENTS.md` | `## Keyed reconciliation — ForEach` / `## Portal` / `## Lazy` / `## Transition`: add one line each — *"Returns `fn` with `isDynamic: true` and `fn.ssr = { kind, props }` (SSR descriptor consumed type-only by `@hellajs/ssr`)."* `## Non-obvious behaviors`: add a bullet documenting the `ssr` contract — the four kind strings, that ssr reads it type-only, that it carries the resolved props, that user-authored isDynamic fns have no `ssr` and render as nothing in SSR. Document the `SsrMeta` type + `RenderFn.ssr` field (under `## HellaNode` or a short new subsection). |

**DoD:**

- [x] All four component sections + Non-obvious behaviors document the `ssr` contract. — ForEach/Portal/Lazy/Transition each note `fn.ssr = { kind, props }`; Non-obvious "Passthrough components" bullet extended.
- [x] `SsrMeta` type + `RenderFn.ssr` field documented. — new `### RenderFn / SsrMeta (isDynamic components)` subsection under `## HellaNode`.

## Blast radius

- dom `dist/` must be rebuilt — `bun coverage dom` does this, and ssr-package tests import from the rebuilt `@hellajs/dom/bundle`.
- `packages/dom/dom-comparison.md`: **re-verify** — it describes ForEach reconciliation behavior and component semantics, NOT the isDynamic return-shape or any function property; adding `ssr` falsifies no claim. No edit expected; worker confirms by grepping the comparison for `isDynamic`/`ssr`/`RenderFn`/`return`.
- Type-only, optional field; no runtime consumer in dom; backward compatible. `git diff packages/dom` is confined to the four component files + `nodes.d.ts` (+ index.ts only if `export type *` does not already cover `SsrMeta`).

## Verification

- [x] `bun coverage dom` green. — EXIT 0; 270 pass / 0 fail; coverage held at baseline.
- [x] No existing core/resource/css/router/store test breaks. — change is additive (optional type field + write-only assignment); `tsc -p tsconfig.lint.json` (all packages) EXIT 0; `rg isDynamic|RenderFn|SsrMeta|ssr` in packages/{core,resource,router,store,css} → none.

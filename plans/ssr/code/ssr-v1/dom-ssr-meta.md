---
depends_on: []
---
# [ ] Unit 1 — dom exposes SSR metadata on isDynamic components

## Scope

- **Gap:** `ForEach`/`Transition`/`Portal`/`Lazy` return opaque `isDynamic` closures whose props are trapped inside (`fn.isDynamic = true; return fn;`). A pure stringifier cannot introspect them, so SSR cannot render lists/transitions/portals/lazy content. Target state: each returned function carries an `__ssr` descriptor (`{ kind, props }`) so an external stringifier can render it without DOM access.
- **Surface: yes** — adds the exported type `SsrMeta` and an optional `__ssr` field on the exported `RenderFn` type (consumed type-only by `@hellajs/ssr`).
- **Type:** Code + Tests + Docs (atomic — Surface:yes).
- **Why this unit exists:** unresolved fork in the original plan — see [`index.md`](./index.md). Prerequisite for `ssr-package.md` scenarios 8–13.

## [ ] Code

**Files:**

| File | Anchor | Change |
|---|---|---|
| `packages/dom/lib/types/nodes.d.ts` | after the `RenderFn` definition (~line 127) | Add `SsrMeta` interface; extend `RenderFn` with optional `__ssr?: SsrMeta`. |
| `packages/dom/lib/ForEach.ts` | before `return fn;` (~line 249) | `fn.__ssr = { kind: "forEach", props };` |
| `packages/dom/lib/Transition.ts` | before `return fn;` (~line 82) | `fn.__ssr = { kind: "transition", props };` |
| `packages/dom/lib/Portal.ts` | before `return fn;` (~line 60) | `fn.__ssr = { kind: "portal", props };` |
| `packages/dom/lib/Lazy.ts` | before `return fn;` (~line 53) | `fn.__ssr = { kind: "lazy", props };` |
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
  /** The resolved props object the component received (ForEachProps / TransitionProps / PortalProps / LazyProps). */
  props: Record<string, unknown>;
}

export type RenderFn = ((element: HellaElement) => void) & { isDynamic: true; __ssr?: SsrMeta };
```

```ts
// One uniform line per component, inserted before `return fn;`,
// where `props` is the component's already-received props parameter:
fn.__ssr = { kind: "forEach", props };     // ForEach.ts  (props: ForEachProps<T>)
fn.__ssr = { kind: "transition", props };  // Transition.ts
fn.__ssr = { kind: "portal", props };      // Portal.ts
fn.__ssr = { kind: "lazy", props };        // Lazy.ts
```

**Strategy:** dom stays "dumb" — it only tags each isDynamic function with its kind and the resolved `props` object it already holds in scope. All string-rendering logic lives in ssr (Unit 2), preserving the plan's "serialization is reimplemented in ssr, not imported" principle and keeping dom DOM-only. The field is **optional** so any user-authored isDynamic fn (none in the public API, but possible) simply renders as nothing in SSR rather than throwing. `props` is the full resolved props object — ssr reads `.each`/`.use`/`.show`/`.children`/`.loading` as needed; keys are never needed (per `../hydration-design.md` Option C). One uniform line per component — no per-kind branching in dom.

**DoD:**

- [ ] `SsrMeta` interface added to `nodes.d.ts`; `RenderFn` extended with optional `__ssr?: SsrMeta`.
- [ ] `SsrMeta` reachable as a type export from `@hellajs/dom` (via existing `export type *` or an explicit re-export).
- [ ] ForEach/Transition/Portal/Lazy each attach `fn.__ssr = { kind, props }` before returning.
- [ ] No mount-time behavior change — `__ssr` is write-only at mount; existing dom tests stay green.
- [ ] `packages/dom/lib/` introduces NO new runtime import (the change is a field assignment + a type).

## [ ] Tests

**Files:** `packages/dom/tests/ssr-meta.test.ts` (new). Surface = the SSR metadata contract.

```ts
import { describe, test, expect, beforeEach } from "bun:test";
import { resetTestState } from "@utils/test-helpers.js";
import { html, ForEach, Transition, Portal, Lazy } from "@hellajs/dom/bundle";
import type { SsrMeta, RenderFn } from "@hellajs/dom";
```
`beforeEach(() => { resetTestState(); })`. Helper at top of file to read the descriptor off the typed fn: `const meta = (fn: RenderFn): SsrMeta | undefined => fn.__ssr;` (typed accessor — no `any`).

- Scenario: ForEach tags itself. → `test("ForEach attaches __ssr with kind forEach and each/use props", () => { const fn = ForEach({ each: [1, 2], use: (i) => html\`<li>${i}</li>\` }) as RenderFn; expect(fn.isDynamic).toBe(true); expect(meta(fn)?.kind).toBe("forEach"); expect(meta(fn)?.props).toHaveProperty("each"); expect(meta(fn)?.props).toHaveProperty("use"); })`
- Scenario: Transition tags itself. → `test("Transition attaches __ssr with kind transition and show/children props", () => { ... show: true, children: html\`<p>x</p>\` ... expect kind "transition"; props has show + children })`
- Scenario: Portal tags itself. → `test("Portal attaches __ssr with kind portal", () => { ... to: "#x", children: [] ... expect kind "portal" })`
- Scenario: Lazy tags itself. → `test("Lazy attaches __ssr with kind lazy and loading prop", () => { ... loader: async () => html\`<div/>\`, loading: html\`<span>…</span>\` ... expect kind "lazy"; props has loading })`
- Scenario: all four keep isDynamic true. → `test("all four isDynamic components retain isDynamic true", () => { ... iterate; each fn.isDynamic === true })`

**DoD:**

- [ ] File exists, surface-named per `guides/tests.md` (no categorical prefix), import order correct, separate `import type`, `beforeEach(resetTestState())`.
- [ ] All 5 scenarios pass.
- [ ] `bun coverage dom` green — no existing dom test breaks; coverage not below baseline.

## [ ] Docs

**Files:**

| File | Change |
|---|---|
| `packages/dom/AGENTS.md` | `## Keyed reconciliation — ForEach` / `## Portal` / `## Lazy` / `## Transition`: add one line each — *"Returns `fn` with `isDynamic: true` and `fn.__ssr = { kind, props }` (SSR descriptor consumed type-only by `@hellajs/ssr`)."* `## Non-obvious behaviors`: add a bullet documenting the `__ssr` contract — the four kind strings, that ssr reads it type-only, that it carries the resolved props, that user-authored isDynamic fns have no `__ssr` and render as nothing in SSR. Document the `SsrMeta` type + `RenderFn.__ssr` field (under `## HellaNode` or a short new subsection). |

**DoD:**

- [ ] All four component sections + Non-obvious behaviors document the `__ssr` contract.
- [ ] `SsrMeta` type + `RenderFn.__ssr` field documented.

## Blast radius

- dom `dist/` must be rebuilt — `bun coverage dom` does this, and ssr-package tests import from the rebuilt `@hellajs/dom/bundle`.
- `packages/dom/dom-comparison.md`: **re-verify** — it describes ForEach reconciliation behavior and component semantics, NOT the isDynamic return-shape or any function property; adding `__ssr` falsifies no claim. No edit expected; worker confirms by grepping the comparison for `isDynamic`/`__ssr`/`RenderFn`/`return`.
- Type-only, optional field; no runtime consumer in dom; backward compatible. `git diff packages/dom` is confined to the four component files + `nodes.d.ts` (+ index.ts only if `export type *` does not already cover `SsrMeta`).

## Verification

- [ ] `bun coverage dom` green.
- [ ] No existing core/resource/css/router/store test breaks (dom is a dependency of several; run the dom gate — others are unaffected by a type-only, optional, write-only field).

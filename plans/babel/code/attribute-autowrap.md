# [x] Auto-wrap call-containing element attribute values

## Scope
- **Gap**: Compiled JSX / `html\`\`` element attribute values that contain a call (`signal()`, `[signal(), "x"]`, `a ? active() : "x"`) are emitted raw, so the dom runtime sees a non-function value and renders it **once** at mount — the DOM never updates when the underlying signal changes. After this change, the compiler auto-wraps such values in `() => expr` (mirroring the existing children heuristic), making element attributes reactive by default.
- **Surface**: yes — the compiled-output contract the dom runtime consumes changes (call-containing element props become thunks), and documented behavior changes (babel `AGENTS.md` "Auto-wrap" bullet; `templates.mdx`; `dom-comparison.md`).
- **Type**: Code + Tests + Docs (atomic — Surface:yes).

## Design rules (load-bearing — extracted from source this session)
- The runtime needs **no change**: `render.ts` `mountNode` already gates on `isFunction(value)` and registers an effect; `renderProp` (`utils.ts`) already joins arrays via `filter(Boolean).join(" ")`. Wrapping the value makes both paths reactive.
- `maybeReactive` (`src/utils/reactive.mjs`) is a safe no-op when there is no call (`containsCall` recurses via babel `VISITOR_KEYS`), so static strings, numbers, bare identifiers, and member-chains-without-calls pass through untouched.
- `maybeReactive`'s top-level-function guard already prevents double-wrapping an explicit `() => …`.
- **Props branch only** — never wrap `on:` / `e:` / `hook:` / `error:` values. These prefixes are checked *before* the props branch, so the wrap is applied only inside the final `else`.
- **Element nodes only** — gate on `!isComponent`.
- **Two attribute code paths**: JSX → `processAttributes`; compiled `html\`\`` → `processComponentAttributes` (called for *both* element and component branches in `src/builders/ast.mjs`). Runtime `html` cannot wrap — unchanged.

## [x] Code
Files: `plugins/babel/src/processors/attributes.mjs` — `processAttributes` (JSX) + `processComponentAttributes` (html\`\``); `plugins/babel/src/builders/ast.mjs` — both `processComponentAttributes` call sites.
Delta:
1. `attributes.mjs`: import `maybeReactive` from `../utils/reactive.mjs`.
2. `processAttributes` (JSX): in the final `else` (props) branch, after computing `value` and before `props.push(...)`, apply `if (!isComponent) value = maybeReactive(t, value);`.
3. `processComponentAttributes` (html\`\``): add a 4th param `isComponent`. In the `value.__slot !== undefined` branch: wrap when `!isComponent`. In the `Array.isArray(value)` branch (mixed-content `+` concat): build the concat, then wrap when `!isComponent`. String/boolean branches have no call → untouched.
4. `ast.mjs`: component branch call site passes `true`; element branch call site passes `false`.
Strategy: mirror the children heuristic exactly. A mixed-content concat containing a call (`class="base ${extra()}"`) becomes `() => "base " + extra()` — consistent with "any call-containing value".

- [x] `attributes.mjs` imports `maybeReactive` and applies it to non-component JSX props in the props branch only. — probe: `<div class={signal()} />` → `class: () => signal()`; `<div on:click={handleClick()} />` → `click: handleClick()` (unwrapped).
- [x] `processComponentAttributes` takes `isComponent` and wraps the `__slot` + `Array.isArray` branches for element nodes only. — probe: html`` `class="${signal()}"` → `() => signal()`; `class="base ${extra()}"` → `() => "base " + extra()`; `<${Comp} class="${fn()}">` → `fn()` (unwrapped).
- [x] `ast.mjs` passes `isComponent` (`true` component / `false` element) at both call sites. — `rg processComponentAttributes ast.mjs` shows `..., true)` and `..., false)`.
- [x] `bun test plugins/babel/tests` green. — 225 pass / 0 fail.
- [x] `bun lint` green. — tsc + eslint + 4 guards all pass.

## [x] Tests
Files: `plugins/babel/tests/transform.test.ts` + `processor.test.ts` (compile output); `packages/dom/tests/template.test.ts` (runtime reactivity).

### Babel (compile-shape) scenarios
- [x] JSX `<div class={signal()} />` → `class: () => signal()` (flipped). — transform.test.ts "regular prop with a call is wrapped".
- [x] JSX `<div class={[signal(), "x"]} />` → wrapped. — "prop array with a call is wrapped".
- [x] JSX `<div class={a ? active() : "x"} />` → wrapped. — "prop ternary with a call is wrapped".
- [x] JSX static + bare-identifier → untouched. — "non-call props ... pass through unwrapped".
- [x] JSX `on:` / `hook:` → NOT wrapped. — "prefixed keys (on:/hook:) are not wrapped".
- [x] JSX `<Btn class={foo()} />` (component) → NOT wrapped. — "component prop is not wrapped".
- [x] html`` element slot + array + mixed-content-with-call → wrapped; `<${Comp}>` → NOT wrapped. — "html mixed-content attribute with a call is wrapped" / "html element array attribute ..." / "html component prop is not wrapped".
- [x] `processor.test.ts` "handles function calls" expectation flipped to `() => handleClick()`; "mixed content array" caller updated to pass `isComponent=false`.

### Dom (runtime reactivity) scenarios
- [x] `class={[signal(), "x"]}` updates on signal change. — template.test.ts "reactive array attribute updates on signal change".
- [x] `class={signal()}` (bare call) updates. — "reactive call attribute updates on signal change".
- [x] `class={... ternary ...}` re-filters falsy on update. — "reactive attribute re-filters falsy entries on update".
- [x] signal-ref + static array regression guards. — existing "renders reactive signals" + "array attribute values (class lists)" still pass (339 dom tests green).
- [x] `bun test plugins/babel/tests` green; `bun coverage dom` green. — 225 pass / 339 pass.

## [x] Docs
Files: `plugins/babel/AGENTS.md` — "Auto-wrap" bullet; `packages/dom/docs/concepts/templates.mdx` — Array Attributes; `packages/dom/dom-comparison.md` — lines ~35 & ~79.
Strategy: bring agent-facing + user-facing text in line with the new contract. Did NOT run `bun sync` (post-commit hook regenerates mirrors).

- [x] babel `AGENTS.md` "Auto-wrap" bullet: removed "regular `props`" + "mixed-content html`` attributes" from Excluded; added element-attribute wrapping (call-containing, element-only) + prefixed-keys exclusion; noted application in `attributes.mjs` + `ast.mjs`. — line 141 rewritten.
- [x] `templates.mdx` Array Attributes: example now shows compiled auto-wrap (no manual `() =>`); note states runtime `html\`\`` still requires the wrapper. — lines 100–108.
- [x] `dom-comparison.md` line ~35: re-verified — now fully true for attributes too; no change needed.
- [x] `dom-comparison.md` line ~79: qualified "at the runtime level" + "the compiler erases this distinction" — reconciled with line ~35. — line 79.
- [x] Doc examples resolve against compiled output; `bun coverage dom` stays green. — 339 pass.

## Blast radius (verified)
- `plugins/babel/tests/*` — 3 assertions flipped (handleClick, regular prop, html mixed-content); all fixed, 225 pass.
- `processor.test.ts:286` caller of `processComponentAttributes` updated to 4-arg form (caught by tsc, fixed). — `rg processComponentAttributes\(types` → `..., false)`.
- `packages/dom/tests/template.test.ts` + `mount.test.ts` — signal-ref + static-array tests unaffected (no call in source), 339 pass.
- No dom runtime change (`render.ts` / `utils.ts` untouched).
- Cross-package importers: none new — `maybeReactive` already exported; only 2 new call sites.
- `dom-comparison.md` drift reconciled (line ~79 qualified; line ~35 now accurate).
- **Changeset**: NOT created (agent-forbidden). This alters published behavior — user must create a `.changeset` entry for `babel-plugin-hellajs` (and note the dom-doc reactivity claim change).

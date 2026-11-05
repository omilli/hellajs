---
name: dom-best-practices
description: >
  Best practices for @hellajs/dom surgical DOM rendering: mount, hydrate, element, component, ForEach, Portal, Lazy, Suspense, Transition, raw, $ref, $collection, registry, onError. Use when writing or reviewing code that imports @hellajs/dom - mounting compiled trees, hydrating server HTML, rendering keyed lists, portaling content, lazy-loading components, animating transitions, attaching on:/e: events, or binding reactivity to existing DOM via $ref/$collection. Covers the silent failure modes: attribute values resolved at render lose reactivity, each={items()} freezes the list, manual DOM mutation is overwritten by the reconciler, index keys rebuild reordered items, unsanitized raw() is an XSS hole, preventDefault no-ops in on: gesture handlers. Use ONLY for DOM rendering - reactive primitives belong to core-best-practices, headless behaviors (focus traps, menus, drag) to headless-best-practices, HTML stringification to ssr-best-practices.
---

# dom-best-practices

Grounded rules for `@hellajs/dom`: surgical DOM updates with no virtual DOM diffing - only elements with reactive dependencies update. Trees are compiled output (JSX through hellajs-compiler, or imperative builds via `@hellajs/dom/runtime`); per-node state lives in a `WeakMap`, cleanup is driven by a scoped MutationObserver. Every rule is derived from the package source and its test suite; each rule file cites the symbols and docs that pin it.

## When to Apply

- Any code importing `@hellajs/dom`: mounting, hydrating, or building component trees.
- Rendering keyed lists (`ForEach`), portals, lazy-loaded components, transitions, or suspense boundaries.
- Attaching `on:`/`e:` event handlers, `hook:` lifecycles, or `error:` boundaries.
- Binding reactivity to existing DOM with `$ref`/`$collection`, or wiring effects via `registry`.

Not for: reactive primitives (`core-best-practices`), headless behaviors like focus traps and menus (`headless-best-practices`), server HTML stringification (`ssr-best-practices`).

## Impact levels

| Level | Meaning |
|---|---|
| CRITICAL | Breaks correctness: lost reactivity, leaks, glitching, hydration mismatch, data loss |
| HIGH | Measurable perf or UX degradation the library exists to prevent |
| MEDIUM | Suboptimal: works but fights the library's model |
| LOW | Convention or consistency |

## Categories

| Prefix | Category | Impact |
|---|---|---|
| mount | Mounting and hydration | CRITICAL |
| el | Elements, props, and templates | CRITICAL |
| list | Keyed lists with ForEach | CRITICAL |
| async | Portals and async boundaries | HIGH |
| evt | Event handling | HIGH |
| state | Imperative refs and state access | MEDIUM |
| err | Error handling | HIGH |
| clean | Cleanup and teardown | HIGH |

## Rules

### Mounting and hydration (mount)

- `mount-compiled-builds-only` - Mount compiled or component-wrapped trees, never hand-built node objects
- `mount-target-contract` - Mount replaces the target's content; know the target forms and the miss throw
- `mount-hydrate-parity` - Hydrate the same build the server rendered with the same initial state
- `mount-async-roots` - Async component roots reject through onError, so register it before mounting

### Elements, props, and templates (el)

- `el-reactive-prop-values` - Pass signals and getters as prop values, never their resolved results
- `el-attribute-value-semantics` - Falsy removes, zero renders, style objects kebab-case with no auto-px
- `el-custom-elements` - Custom element attributes are reactive string getters; children are captured once
- `el-raw-sanitized` - raw() inserts unescaped HTML - sanitize untrusted input before it
- `el-registry-effects-hooks` - registry effects are separate and accumulative; hooks stack by insertion order

### Keyed lists with ForEach (list)

- `list-each-signal-not-array` - Pass the signal to each, not a resolved array
- `list-stable-unique-keys` - Give every item a stable, unique key
- `list-single-root-items` - ForEach items render one root element; fragments throw

### Portals and async boundaries (async)

- `async-portal-targets` - Portal targets must exist at mount; remote content cleans up with its region
- `async-lazy-loader-contract` - Lazy loaders take a signal and resolve to a component; errors stay local
- `async-suspense-one-shot` - Suspense runs its child once; reactive async belongs to resource
- `async-transition-css-parity` - Match Transition duration to the CSS animation; appear gates first mount

### Event handling (evt)

- `evt-delegated-capture` - on: handlers are capture-phase and delegated; this is the element
- `evt-direct-gestures` - Use e: with passive false for cancelable gestures and non-bubbling events

### Imperative refs and state access (state)

- `state-ref-queue-then-watch` - $ref ops queue until the element appears; element inputs never watch
- `state-collection-lifecycle` - $collection covers future matches; dispose to stop watching
- `state-introspection-teardown` - WeakMap state access, queue counts, and resetDom between tests

### Error handling (err)

- `err-boundaries-category-reset` - error: configs define boundaries; category alone is not one
- `err-onerror-global` - onError is the global drain: first non-null fallback build wins

### Cleanup and teardown (clean)

- `clean-reconciler-owns-dom` - Never hand-mutate mounted DOM; write signals instead
- `clean-removal-driven-teardown` - Removal disposes reactivity on the next microtask; unmount is synchronous

Full rule text, incorrect/correct examples, and source references: `AGENTS.md` in this folder (compiled from `rules/` by `vp run skills-build`).

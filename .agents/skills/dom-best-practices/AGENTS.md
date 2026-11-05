# dom-best-practices

Compiled by `vp run skills-build` from `rules/` - never hand-edit; regenerate instead.

Best practices for @hellajs/dom, the surgical-DOM rendering package: mounting compiled trees, hydrating server HTML in place, keyed list reconciliation, portals, lazy and suspense boundaries, delegated events, and reactive references over existing DOM. Every rule is grounded in the package source and test suite.

- Version: 1.0.0
- Organization: HellaJS
- Date: 2026-11-04

## Impact levels

| Level | Meaning |
|---|---|
| CRITICAL | Breaks correctness: lost reactivity, leaks, glitching, hydration mismatch, data loss |
| HIGH | Measurable perf or UX degradation the library exists to prevent |
| MEDIUM | Suboptimal: works but fights the library's model |
| LOW | Convention or consistency |

## Contents
- 1. Mounting and hydration
  - 1.1 Async component roots reject through onError, so register it before mounting (`mount-async-roots`)
  - 1.2 Mount compiled or component-wrapped trees, never hand-built node objects (`mount-compiled-builds-only`)
  - 1.3 Hydrate the same build the server rendered with the same initial state (`mount-hydrate-parity`)
  - 1.4 Mount replaces the target's content; know the target forms and the miss throw (`mount-target-contract`)
- 2. Elements, props, and templates
  - 2.1 Falsy removes, zero renders, style objects kebab-case with no auto-px (`el-attribute-value-semantics`)
  - 2.2 Custom element attributes are reactive string getters; children are captured once (`el-custom-elements`)
  - 2.3 raw() inserts unescaped HTML - sanitize untrusted input before it (`el-raw-sanitized`)
  - 2.4 Element positions auto-wrap reactive expressions; component props and children pass through as-is (`el-reactive-prop-values`)
  - 2.5 registry effects are separate and accumulative; hooks stack by insertion order (`el-registry-effects-hooks`)
- 3. Keyed lists with ForEach
  - 3.1 Pass the signal to each, not a resolved array (`list-each-signal-not-array`)
  - 3.2 ForEach items render one root element; fragments throw (`list-single-root-items`)
  - 3.3 Give every item a stable, unique key (`list-stable-unique-keys`)
- 4. Portals and async boundaries
  - 4.1 Lazy loaders take a signal and resolve to a component; errors stay local (`async-lazy-loader-contract`)
  - 4.2 Portal targets must exist at mount; remote content cleans up with its region (`async-portal-targets`)
  - 4.3 Suspense runs its child once; reactive async belongs to resource (`async-suspense-one-shot`)
  - 4.4 Match Transition duration to the CSS animation; appear gates first mount (`async-transition-css-parity`)
- 5. Event handling
  - 5.1 on: handlers are capture-phase and delegated; this is the element (`evt-delegated-capture`)
  - 5.2 Use e: with passive false for cancelable gestures and non-bubbling events (`evt-direct-gestures`)
- 6. Imperative refs and state access
  - 6.1 $collection covers future matches; dispose to stop watching (`state-collection-lifecycle`)
  - 6.2 WeakMap state access, queue counts, and resetDom between tests (`state-introspection-teardown`)
  - 6.3 $ref ops queue until the element appears; element inputs never watch (`state-ref-queue-then-watch`)
- 7. Error handling
  - 7.1 error: configs define boundaries; category alone is not one (`err-boundaries-category-reset`)
  - 7.2 onError is the global drain: first non-null fallback build wins (`err-onerror-global`)
- 8. Cleanup and teardown
  - 8.1 Never hand-mutate mounted DOM; write signals instead (`clean-reconciler-owns-dom`)
  - 8.2 Removal disposes reactivity on the next microtask; unmount is synchronous (`clean-removal-driven-teardown`)

## 1. Mounting and hydration

### 1.1 Async component roots reject through onError, so register it before mounting

**Impact: HIGH** - an async mount rejection has no element context, so no error boundary or fallback renders - without an onError handler it is only console.error, and downstream code assumes a mount that never happened

`mount` accepts an async component function (`async () => build`) resolving to a flagged build. When that promise rejects, the error routes through `dispatchError` with `phase: "mount"` and no element context - meaning no boundary walk, no fallback UI, only your global `onError` handler (or a bare `console.error`). Register `onError` before issuing the async mount, and render a user-visible fallback from it; do not let loader failures vanish into the console while the rest of the app waits on a tree that never attaches.

**Incorrect (what is wrong):**

```tsx
import { mount } from "@hellajs/dom";

// No onError registered: a failed load logs "[dom] <error>" and the app
// silently never mounts.
mount(async () => {
  const mod = await Promise.reject(new Error("chunk failed"));
  return component(mod as never, {});
}, "#app");
```

**Correct (what is right):**

```tsx
import { component, mount, onError } from "@hellajs/dom";
import type { ComponentFn, TemplateBuildFn } from "@hellajs/dom";

const loadApp = (): Promise<{ App: ComponentFn }> =>
  Promise.resolve({ App: () => <div id="root">app</div> });
const reportToTelemetry = (error: Error, phase: string): void => void console.info(phase, error);

onError((error, context) => {
  reportToTelemetry(error, context.phase);
  return <p role="alert">Could not load the app. Retry.</p>; // the flagged build
});

mount(async () => {
  const mod = await loadApp(); // rejections land in the handler above
  return component(mod.App, {}) as TemplateBuildFn;
}, "#app");
```

Reference: `packages/dom/lib/mount.ts mount` and `packages/dom/lib/features/errors.ts onError` and `packages/dom/docs/api/onerror.mdx`

### 1.2 Mount compiled or component-wrapped trees, never hand-built node objects

**Impact: CRITICAL** - hand-built HellaNode input throws at mount, so nothing renders and the error names an API that does not exist for hand-authoring

`mount` and `hydrate` accept flagged build functions - the output of compiled JSX (a `component()` result, a compiled element, or a wrapper returning one), typed as `TemplateBuildFn`. There is no virtual-DOM object input: a plain `{ tag, props, children }` tree is the server/compiler currency (`HellaNode`, consumed by `@hellajs/ssr`), and passing one throws `[dom] mount: hand-built HellaNode input is not supported - compile via hellajs-compiler or build imperatively via @hellajs/dom/runtime`. Build trees as JSX components (or call the `@hellajs/dom/runtime` wiring fns imperatively), wrap in `component()` when you need a disposal scope, and mount that.

**Incorrect (what is wrong):**

```tsx
import { mount } from "@hellajs/dom";

// Hand-built node object: the VDOM instinct. Throws the documented rejection -
// HellaNode is the server stringifier's currency, not a mount input.
const tree = { tag: "div", props: { id: "root" }, children: ["hello"] };
mount(tree as never, "#app");
```

**Correct (what is right):**

```tsx
import { component, mount } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";

const App = () => <div id="root">hello</div>;
// component() wraps the render in a disposal scope and flags the build; the
// cast narrows ComponentReturn to its client arm for the mount parameter.
mount(() => component(App, {}) as TemplateBuildFn, "#app");
```

Reference: `packages/dom/lib/mount.ts mount` and `packages/dom/lib/runtime.ts TemplateBuildFn` and `packages/dom/docs/api/mount.mdx`

### 1.3 Hydrate the same build the server rendered with the same initial state

**Impact: CRITICAL** - a different build or different initial signal values diverge from the server HTML - regions warn and rebuild, unmatched root claims throw, and the user sees a flash or a dead page

`hydrate(node, target)` wires effects, handlers, and state onto the DOM the server shipped - it never replaces nodes. The input must be the same compiled component the server rendered (`ssr()` output must be the target's children), and every signal must initialize to the same values the server rendered: drift is a mismatch. Divergence surfaces two ways - a reactive region whose count or markers disagree warns and fresh-mounts that region, while a root claim with no matching server node throws `[dom] hydrate: unmatched server DOM for imperative root`. Derive initial state on the client from the same source the server used (props, cookies, serialized state), never from a different default.

**Incorrect (what is wrong):**

```tsx
import { hydrate } from "@hellajs/dom";
import { signal } from "@hellajs/core";

// Server rendered open=false; the client initializes open=true - every
// region reading `open` mismatches its server HTML on first paint.
const open = signal(true);
hydrate(() => <details open={open}>Panel</details>, "#app");
```

**Correct (what is right):**

```tsx
import { hydrate } from "@hellajs/dom";
import { signal } from "@hellajs/core";

// Same initial value the server rendered: regions claim their server nodes
// in place (identity preserved - nothing is cloned or re-created).
const open = signal(false);
hydrate(() => <details open={open}>Panel</details>, "#app");
```

An empty container is legal: `hydrate` mounts fresh through the same create arms, so one code path serves both entry points.

Reference: `packages/dom/lib/hydrate.ts hydrate` and `packages/dom/tests/hydrate-imperative.test.ts` and `packages/dom/docs/api/hydrate.mdx`

### 1.4 Mount replaces the target's content; know the target forms and the miss throw

**Impact: MEDIUM** - a selector that matches nothing throws at mount time, and mount wipes the target's existing children - static content in the mount container is destroyed, not appended to

`mount(node, target)` takes a CSS selector string, an `Element`, or a `ShadowRoot`, defaulting to `"#app"`. A selector string resolves via `querySelector` at call time - no match throws `[dom] mount: target "<target>" not found in document`. The attach calls `replaceChildren`: every existing child of the target is replaced by the mounted tree, so never point `mount` at a container holding static content you want kept (sibling containers survive; the target's own children do not). Pass the `Element` itself when the container is already in hand - that is also how you mount into shadow roots and detached elements without selector races.

**Incorrect (what is wrong):**

```tsx
import { mount } from "@hellajs/dom";

// #app does not exist yet and the container holds a server-rendered banner
// that must survive - this throws on the miss (or wipes the banner on a hit).
const handle = mount(App, "#app");
```

**Correct (what is right):**

```tsx
import { component, mount } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";

const App = () => <p>Mounted content</p>;
const host = document.getElementById("shell")!;
// Mount the element directly: no selector race, and the intent to replace
// the shell's content is explicit at the call site.
const handle = mount(() => component(App, {}) as TemplateBuildFn, host);
```

Reference: `packages/dom/lib/mount.ts mount` and `packages/dom/docs/api/mount.mdx`


## 2. Elements, props, and templates

### 2.1 Falsy removes, zero renders, style objects kebab-case with no auto-px

**Impact: MEDIUM** - assuming VDOM-style value handling produces removed attributes where "0" was meant, unitless style numbers that silently do nothing, and class lists that never combine

`renderProp` applies values through a fixed branch order, not React-style attribute normalization. `false`, `null`, and `undefined` REMOVE the attribute - that is the intended conditional-attribute pattern (`class={active() ? "on" : null}`) - while `0` is a value and renders `"0"`, and `""` renders as an empty attribute. `value`, `checked`, `selected`, and `innerHTML` set the element's IDL property directly (falsy becomes `""`, never removal). A `style` object serializes camelCase keys to kebab-case declarations, DROPS falsy declarations, and adds no automatic units - write `fontSize: "12px"`, not `12` - while `class` accepts an array of strings, space-joined with falsy entries filtered out.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";

const count = signal(0);
const active = signal(false);
// Expects data-count to disappear at 0 (it renders "0") and expects
// CSS "font-size: 12px" from a unitless number (no declaration renders).
const App = () => (
  <div data-count={count()} style={{ fontSize: 12 }} class={[active() && "on"]}>
    Badge
  </div>
);
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";

const count = signal(0);
const active = signal(false);
// 0 renders "0"; units are explicit; the class getter is reactive, so the
// toggle re-renders (null removes, arrays space-join filtering falsy).
const App = () => (
  <div data-count={count} style={{ fontSize: "12px" }} class={() => [active() ? "on" : null]}>
    Badge
  </div>
);
```

Reference: `packages/dom/lib/internal/utils.ts renderProp` and `packages/dom/lib/types/attributes.d.ts StyleObject` and `packages/dom/docs/concepts/attribute-prefixes.mdx`

### 2.2 Custom element attributes are reactive string getters; children are captured once

**Impact: HIGH** - treating element() props as values instead of functions freezes the render at initial attribute values, and later slot-content mutations never re-project

`element(tagName, render, options?)` defines a custom element (tag must be hyphenated). Inside the render fn, `props` is a proxy: every attribute key reads as a reactive getter `() => string | null` that re-runs when the attribute changes (attributes are always strings - parse numbers yourself; missing attributes read `null`), while `props.children` and `props.slots` expose the child nodes captured once before first mount - later DOM changes to slot content never re-project. Call the getter inside the render to stay reactive; wrap it in a signal or computation when you need a typed value. Pass `options.shadow` (boolean or `ShadowRootInit`) to render into a shadow root instead of light DOM. Disconnect disposes and a reconnect re-renders from scratch - component state does not survive.

**Incorrect (what is wrong):**

```tsx
import { element } from "@hellajs/dom";

// Reads the attribute once as a string and renders it statically -
// attribute changes never re-run anything.
element("user-badge", (props) => {
  const name = String(props.name);
  return <span>{name}</span>;
});
```

**Correct (what is right):**

```tsx
import { element } from "@hellajs/dom";

// props.name is a reactive getter: call it in the render so the span
// re-renders when setAttribute("name", ...) fires.
element("user-badge", (props) => {
  return <span class="badge">{props.name}</span>;
});
```

Reference: `packages/dom/lib/element.ts element` and `packages/dom/docs/api/element.mdx` and `packages/dom/docs/concepts/custom-elements.mdx`

### 2.3 raw() inserts unescaped HTML - sanitize untrusted input before it

**Impact: CRITICAL** - raw() bypasses HTML escaping by design, so user-controlled strings inside it are script injection (XSS); nothing inside the boundary is reactive or hydrated

`raw(html)` wraps a string as an opaque child: the renderer parses and inserts it verbatim with no escaping, `ssr()` emits it marker-bounded and unescaped, and `hydrate` adopts the existing nodes without wiring anything inside - no reactive scope crosses the boundary. That is exactly right for pre-rendered HTML from a trusted renderer (a meta-framework's slot output, server-produced fragments). It is an XSS hole for anything user-influenced: sanitize with a policy-based sanitizer before wrapping, and never interpolate request data into the string. If the content needs reactivity, it must be a real component, not raw HTML.

**Incorrect (what is wrong):**

```tsx
import { raw } from "@hellajs/dom";
import type { ComponentFn } from "@hellajs/dom";

const Comment: ComponentFn = (props) => (
  <div>{raw(String(props.bodyHtml))}</div>
);
// props.bodyHtml comes from the request - a script tag sails through unescaped.
```

**Correct (what is right):**

```tsx
import { raw } from "@hellajs/dom";
import type { ComponentFn } from "@hellajs/dom";

declare function sanitizeHtml(dirty: string): string; // your policy-based sanitizer

const Comment: ComponentFn = (props) => (
  // Trusted renderer output only; user input is sanitized to an allowlist first.
  <div>{raw(sanitizeHtml(String(props.bodyHtml)))}</div>
);
```

Reference: `packages/dom/lib/features/raw.ts raw` and `packages/dom/docs/api/raw.mdx`

### 2.4 Element positions auto-wrap reactive expressions; component props and children pass through as-is

**Impact: CRITICAL** - a signal call at component position resolves once at build time - the prop or child renders its initial value and never updates again, with no error to notice

At element position the compiler wraps any call-containing attribute value or child in a getter, so `class={theme()}` and `<p>{count()}</p>` are reactive, exactly like the bare forms `class={theme}` and `<p>{count}</p>`. At component position nothing is wrapped: props and children pass through as-is, so `label={theme()}` (or a child `<Card>{count()}</Card>`) resolves the signal during the build and the value freezes at its initial state, silently. Pass the signal or a getter into components and let the child component read it at its own element positions. Hand-authored `@hellajs/dom/runtime` calls mirror the component rule: a plain value applies once, a function value is effect-wrapped.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";

const theme = signal("light");
// label={theme()} resolves NOW: the child receives the string "light"
// forever, no matter how often theme changes.
const App = () => <ThemeCard label={theme()}>Settings</ThemeCard>;
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import type { Signal } from "@hellajs/core";
import type { HellaChildren } from "@hellajs/dom";

const theme = signal("light");

type ThemeCardProps = { label: Signal<string>; children?: HellaChildren };

const ThemeCard = ({ label }: ThemeCardProps) => (
  <section>{label}</section>
);

// The signal itself: the child's element positions keep the binding
// reactive across the component boundary.
const App = () => <ThemeCard label={theme}>Settings</ThemeCard>;
```

Reference: `plugins/compiler/src/processors/attributes.mjs maybeReactive` and `packages/dom/lib/runtime.ts prop` and `packages/dom/docs/concepts/components.mdx`

### 2.5 registry effects are separate and accumulative; hooks stack by insertion order

**Impact: MEDIUM** - registering hooks without the hooks feature loaded silently no-ops, and forgetting that effects/hooks stack means re-registering on re-render leaks duplicates

`registry.addEffect(node, fn)` registers `fn` as a separate effect - the element's state array owns its disposal, there is no parent link to an enclosing effect, and removal of the node drains every registered disposer. Multiple `addEffect` calls on one node stack; they all run. `registry.addHook(element, type, handler)` stacks hooks of the same type in insertion order and fires `afterMount` immediately when the element is already mounted. Two gates to know: `hook:` JSX (and `$ref`/`$collection`) load the hooks feature automatically, but a hand-built imperative consumer of `registry.addHook` must import `"@hellajs/dom/features/hooks"` itself - without the feature, `addHook` is a no-op. Register once per element lifecycle (build time), not per update.

**Incorrect (what is wrong):**

```tsx
import { registry } from "@hellajs/dom";

const badge = document.createElement("span");
// No feature import: this addHook call silently registers nothing -
// the handler never fires.
registry.addHook(badge, "afterMount", () => void 0);
```

**Correct (what is right):**

```tsx
import { registry } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import "@hellajs/dom/features/hooks";

const badge = document.createElement("span");
const status = signal("idle");

// Effects stack and are drained when the node is removed.
registry.addEffect(badge, () => {
  badge.textContent = status();
});
registry.addHook(badge, "afterMount", (el) => el?.setAttribute("data-ready", "true"));
```

Reference: `packages/dom/lib/registry.ts registry` and `packages/dom/docs/api/registry.mdx` and `packages/dom/docs/api/hook.mdx`


## 3. Keyed lists with ForEach

### 3.1 Pass the signal to each, not a resolved array

**Impact: CRITICAL** - each={items()} snapshots the array at build time - the list renders once and signal writes never reconcile it again, with no error to notice

`ForEach` reconciles by re-running one registered effect whenever the `each` source changes. That only works when `each` receives the reactive source itself - a signal (or a getter function). Passing `each={items()}` calls the signal during the build and hands ForEach a plain array: the effect runs once over the snapshot and has no dependency to re-run on, so adds, removes, and reorders never reach the DOM. The compiler cannot catch this - both forms typecheck. Audit every `each=` for call parentheses; the same snapshots-forever trap applies to any prop surface documented as accepting a signal.

**Incorrect (what is wrong):**

```tsx
import { ForEach } from "@hellajs/dom";
import { signal } from "@hellajs/core";

const items = signal(["a", "b"]);
// items() snapshots now: pushing "c" later never updates the list.
const List = () => (
  <ul>
    <ForEach each={items()} use={(item: string) => <li>{item}</li>} />
  </ul>
);
```

**Correct (what is right):**

```tsx
import { ForEach } from "@hellajs/dom";
import { signal } from "@hellajs/core";

const items = signal(["a", "b"]);
// The signal itself: every write reconciles the list in place (keyed, minimal moves).
const List = () => (
  <ul>
    <ForEach each={items} use={(item: string) => <li>{item}</li>} />
  </ul>
);
```

Reference: `packages/dom/lib/ForEach.ts ForEach` and `packages/dom/docs/api/foreach.mdx`

### 3.2 ForEach items render one root element; fragments throw

**Impact: HIGH** - a use callback returning a JSX fragment throws at item build with the documented single-element error, taking down the whole list render

ForEach tracks exactly one DOM node per item (`keyToNode`), so the `use` callback must resolve to a single root - one element or one text node. Returning a JSX fragment (`<>...</>`) resolves to a `DocumentFragment` and throws `[dom] ForEach: use must return a single element` when that item builds, initial render or keyed reuse alike. Need multiple top-level nodes per item? Wrap them in one carrying element (often a `<li>`/`<tr>` anyway, since table structure demands it) or model the group as a nested component returning a single root.

**Incorrect (what is wrong):**

```tsx
import { ForEach } from "@hellajs/dom";
import { signal } from "@hellajs/core";

const rows = signal(["a", "b"]);
// Two roots per item: the fragment throws the single-element error at build.
const Table = () => (
  <tbody>
    <ForEach
      each={rows}
      use={(row: string) => (
        <>
          <tr><td>{row}</td></tr>
          <tr><td>spacer</td></tr>
        </>
      )}
    />
  </tbody>
);
```

**Correct (what is right):**

```tsx
import { ForEach } from "@hellajs/dom";
import { signal } from "@hellajs/core";

const rows = signal(["a", "b"]);
// One root per item: the tracked node is the row itself.
const Table = () => (
  <tbody>
    <ForEach each={rows} use={(row: string) => <tr><td>{row}</td></tr>} />
  </tbody>
);
```

Reference: `packages/dom/lib/ForEach.ts ForEach` and `packages/dom/docs/api/foreach.mdx`

### 3.3 Give every item a stable, unique key

**Impact: CRITICAL** - without stable unique keys ForEach falls back to array-index keys - a reorder or prepend rebuilds every shifted item, destroying per-item DOM state - and duplicate keys make the last write win, wiring two items to one node

ForEach resolves a key per item in priority order: the `key` extractor prop, the rendered node's `key` prop, the item's own `id` property, and finally the array index. Explicit-class keys (extractor, node `key`, `item.id`) reuse a live node by key identity regardless of item reference; the index fallback additionally requires the same item reference at that position, which a reorder or prepend breaks - every shifted position rebuilds its node and loses whatever per-item DOM state it held (input focus, expansion, uncommitted text). Keys must also be unique across the list: duplicates collide in the key map and the last item silently wins. Pass `key` when items lack a stable `id`, and keep the key stable across edits (the row's database id, never a generated-per-render value).

**Incorrect (what is wrong):**

```tsx
import { ForEach } from "@hellajs/dom";
import { signal } from "@hellajs/core";

const todos = signal([{ text: "a" }, { text: "b" }]);
// No key, no item.id: index keys. Prepending "new" rebuilds both rows -
// a half-typed inline edit in row 0 is lost.
const List = () => (
  <ul>
    <ForEach each={todos} use={(todo: { text: string }) => <li>{todo.text}</li>} />
  </ul>
);
```

**Correct (what is right):**

```tsx
import { ForEach } from "@hellajs/dom";
import { signal } from "@hellajs/core";

type Todo = { id: number; text: string };
const todos = signal<Todo[]>([
  { id: 1, text: "a" },
  { id: 2, text: "b" },
]);
// Stable unique ids: a prepend moves zero nodes' worth of state - each row
// keeps its DOM node (and its inline edit) across any reorder.
const List = () => (
  <ul>
    <ForEach each={todos} key={(todo: Todo) => todo.id} use={(todo: Todo) => <li>{todo.text}</li>} />
  </ul>
);
```

Index keys are acceptable only for append-only lists whose items never reorder or get removed from the middle.

Reference: `packages/dom/lib/ForEach.ts ForEach` and `packages/dom/docs/api/foreach.mdx`


## 4. Portals and async boundaries

### 4.1 Lazy loaders take a signal and resolve to a component; errors stay local

**Impact: HIGH** - ignoring the abort signal keeps network work running after the region unmounts, and expecting Lazy failures in onError means the user sees the loading state forever

`Lazy` calls `loader({ signal })` once when its region mounts. Forward that AbortSignal into the fetch so a region removed mid-load cancels its network work - the loader's settle callbacks are also guarded internally, but only the signal stops the request. The loader must resolve to a component (a `ComponentFn` or flagged build) - not a promise of a promise, and not a rendered element. On rejection, `fallback` (a flagged build) replaces the region; with no fallback the error logs and whatever is on screen stays. Lazy errors never reach `onError` or error boundaries - the fallback is the whole error story here, unlike `Suspense`.

**Incorrect (what is wrong):**

```tsx
import { Lazy } from "@hellajs/dom";

// Signal ignored: the download keeps running after unmount; no fallback means
// a failed load leaves the loading UI forever (onError never fires for Lazy).
const App = () => (
  <Lazy
    loader={() => fetch("/panel.js").then((res) => res.text() as never)}
    loading={<p>Loading...</p>}
  />
);
```

**Correct (what is right):**

```tsx
import { Lazy } from "@hellajs/dom";
import type { ComponentFn } from "@hellajs/dom";

const Panel: ComponentFn = () => <section class="panel">Heavy content</section>;

const loadPanel = (options?: { signal?: AbortSignal }): Promise<ComponentFn> =>
  new Promise((resolve) => {
    void options?.signal; // forward to the real fetch: abort stops the work
    setTimeout(() => resolve(Panel), 0);
  });

const App = () => (
  <Lazy
    loader={loadPanel}
    loading={<p>Loading...</p>}
    fallback={<p role="alert">Panel failed to load.</p>}
  />
);
```

Reference: `packages/dom/lib/Lazy.ts Lazy` and `packages/dom/docs/api/lazy.mdx`

### 4.2 Portal targets must exist at mount; remote content cleans up with its region

**Impact: HIGH** - a missing target selector throws from the portal's first effect run and takes down the whole containing render, and content left in a dead target is a leak

`Portal` renders its children into a remote target resolved by `document.querySelector(to)` at the first effect run - not at construction. A miss throws `[dom] Portal: target "<to>" not found in document`, and because portal content mounts through the component dispatch, that error surfaces in the containing render. Ensure the target element exists before the portal's region mounts (create the container, or guard conditional portals on the target's presence). Cleanup is anchor-owned: removing the portal's region in the original tree removes the remote nodes and unwinds their state, so never hand-delete portal content from the target - remove or unmount the source region instead. `type` must be one of `"append" | "prepend" | "replace" | "before" | "after"` (default `"append"`); anything else throws at construction.

**Incorrect (what is wrong):**

```tsx
import { Portal } from "@hellajs/dom";

// #modals is not in the document yet: the render that contains this portal
// throws at the portal's first effect run.
const App = () => (
  <Portal to="#modals">
    <div class="modal">Dialog</div>
  </Portal>
);
```

**Correct (what is right):**

```tsx
import { Portal } from "@hellajs/dom";

const host = document.createElement("div");
host.id = "modals";
document.body.append(host); // target exists before the portal mounts

const App = () => (
  <Portal to="#modals">
    <div class="modal">Dialog</div>
  </Portal>
);
```

Reference: `packages/dom/lib/Portal.ts Portal` and `packages/dom/docs/api/portal.mdx`

### 4.3 Suspense runs its child once; reactive async belongs to resource

**Impact: HIGH** - wrapping a signal-reading async child in Suspense and expecting re-fetch on signal change leaves stale content on screen - the boundary is one-shot by design

`<Suspense fallback={...}>` evaluates its child once at mount (or claims the server's resolved stage under hydrate). A thenable child suspends - the fallback renders until settle, then swaps in - but the child never re-runs when a signal it read changes: the boundary is one-shot. For data that refetches on state change, pair `@hellajs/resource` with a reactive child that branches on the resource's getters (`isLoading()`, `data()`), letting the child itself switch between pending and resolved views. Rejections from the suspended child DO bubble - to the nearest `error:` boundary or `onError` - the opposite of `Lazy`, whose errors stay local to its fallback.

**Incorrect (what is wrong):**

```tsx
import { Suspense } from "@hellajs/dom";
import { signal } from "@hellajs/core";

const userId = signal(1);
// The child runs once with userId 1; writing userId(2) never refetches -
// Suspense does not re-suspend on signal changes.
const Profile = () => (
  <Suspense fallback={<p>Loading...</p>}>{() => fetchUser(userId())}</Suspense>
);
```

**Correct (what is right):**

```tsx
import { Suspense } from "@hellajs/dom";

// One-shot async is exactly right here: the child resolves once, the fallback
// shows until settle, and a rejection bubbles to the nearest boundary.
const greeting = new Promise<string>((resolve) => setTimeout(() => resolve("Hi"), 0));

const Banner = () => <Suspense fallback={<p>Loading...</p>}>{() => greeting}</Suspense>;
```

For reactive refetching, see the resource package: a reactive child branching on `isLoading()`/`data()` re-renders on every fetch cycle.

Reference: `packages/dom/lib/Suspense.ts Suspense` and `packages/dom/docs/api/suspense.mdx` and `packages/resource/lib/index.ts`

### 4.4 Match Transition duration to the CSS animation; appear gates first mount

**Impact: MEDIUM** - duration defaults to 300ms while the CSS animation runs longer, so the element is ripped out mid-animation - or, with appear unset, the first mount plays no enter class at all

`<Transition show={...} enter leave duration>` adds the `enter` class when content appears and the `leave` class before removing it, scheduling removal at `duration + 50` ms (default 300). The `duration` prop must match the CSS animation's duration - the timer, not the animation, decides when the node is removed, so a mismatch cuts the animation short or leaves dead nodes hanging. Without `appear`, NO class is added on the very first mount (only on later show toggles) - set `appear` (or `appear="custom-class"`) to animate initial entry. Rapid show/hide toggles are rescued: a re-show during a pending leave cancels the timer and keeps the node.

**Incorrect (what is wrong):**

```tsx
import { Transition } from "@hellajs/dom";
import { signal } from "@hellajs/core";

const open = signal(false);
// CSS: .fade-out { animation: fadeOut 0.6s; } - duration defaults to 300ms,
// so removal fires at 350ms mid-animation, chopping the exit.
const Panel = () => (
  <Transition show={open} enter="fade-in" leave="fade-out">
    <div class="panel">Content</div>
  </Transition>
);
```

**Correct (what is right):**

```tsx
import { Transition } from "@hellajs/dom";
import { signal } from "@hellajs/core";

const open = signal(false);
// duration matches the 600ms CSS animations; appear animates the first mount.
const Panel = () => (
  <Transition show={open} enter="fade-in" leave="fade-out" duration={600} appear>
    <div class="panel">Content</div>
  </Transition>
);
```

Reference: `packages/dom/lib/Transition.ts Transition` and `packages/dom/docs/api/transition.mdx`


## 5. Event handling

### 5.1 on: handlers are capture-phase and delegated; this is the element

**Impact: MEDIUM** - expecting target-phase or bubbling semantics misorders handlers, and relying on automatic stopPropagation lets outer handlers fire when they should not

`on:` attributes register on one shared capture-phase listener per event type on `document.body` - no per-element listener is created. Dispatch walks `event.composedPath()` target-first, so the innermost element's handler runs before an outer one's, regardless of capture direction intuition; inside a handler, `this` is the element carrying the handler and `event.target` is the origin. Delegation never auto-stops propagation: every handler on the path fires unless one calls `event.stopPropagation()` (or `stopImmediatePropagation`). Registered event types stay registered for the page lifetime - cleanup removes element handlers, not the shared body listener.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";

const clicks = signal(0);
// Expects event.target === the button and expects the card's handler NOT to
// fire after the button's: delegation fires both, innermost first, unless a
// handler stops propagation explicitly.
const Card = () => (
  <div on:click={() => void 0}>
    <button on:click={function (this: HTMLElement) { clicks(clicks() + 1); }}>
      Count {clicks}
    </button>
  </div>
);
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";

const clicks = signal(0);
const Card = () => (
  <div on:click={() => void 0}>
    <button
      on:click={function (this: HTMLElement, event: MouseEvent) {
        event.stopPropagation(); // the card's click handler stays quiet
        clicks(clicks() + 1); // this === the button
      }}
    >
      Count {clicks}
    </button>
  </div>
);
```

Reference: `packages/dom/lib/internal/events.ts` and `packages/dom/docs/api/on.mdx` and `packages/dom/docs/concepts/attribute-prefixes.mdx`

### 5.2 Use e: with passive false for cancelable gestures and non-bubbling events

**Impact: HIGH** - preventDefault in an on: touch/wheel handler is silently ignored - browsers treat the shared body-level listener as passive, so pull-to-refresh and scroll-blocking gestures break with no error

`e:` attributes attach a real per-instance listener (bubble phase, error-boundary-wrapped, removed with the element). Use it where delegation cannot work: non-bubbling events (`focus`, `blur` - they never reach the body listener), listeners third-party code expects to find, and cancelable gestures. The gesture case is the silent one: browsers treat body-level `touchstart`/`touchmove`/`wheel` listeners as passive by default, and HellaJS's shared `on:` body listener cannot opt out without degrading scrolling for every app - so `event.preventDefault()` inside an `on:` gesture handler is a no-op. Pass the value as a `{ handler, options }` spec with `passive: false` to cancel, or `once`/`capture` for the other native flags.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";

const pulled = signal(0);
// Delegated on: - the browser runs the shared body listener passive, so
// preventDefault() is silently ignored and the page scrolls anyway.
const Feed = () => (
  <div on:touchmove={(event) => { event.preventDefault(); pulled(pulled() + 1); }}>
    Pull to refresh
  </div>
);
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";

const pulled = signal(0);
// Direct listener with native options: passive false makes preventDefault work.
const Feed = () => (
  <div
    e:touchmove={{
      handler: (event) => {
        event.preventDefault();
        pulled(pulled() + 1);
      },
      options: { passive: false },
    }}
  >
    Pull to refresh
  </div>
);
```

Non-bubbling events (`e:focus`, `e:blur`) follow the same rule by necessity - delegation never sees them.

Reference: `packages/dom/lib/features/direct-events.ts` and `packages/dom/docs/api/e.mdx`


## 6. Imperative refs and state access

### 6.1 $collection covers future matches; dispose to stop watching

**Impact: MEDIUM** - reading collection[i] for dynamically added elements yields undefined - indexed access holds only the initial set - and a $collection never disposed keeps a document.body observer alive forever

`$collection(selector)` wraps every current match and registers a body-level watcher so elements added later auto-apply the same queued operations (`bind`/`on`/`hooks`/`forEach` apply to current AND future members). Two asymmetries to respect: indexed access (`collection[2]`) is populated only for the initial set - dynamically added elements are reachable through the callable form `collection(2)` and `length`; and the watcher (a document.body MutationObserver with a selector registry) lives until you call `dispose()` - call it when the page section driving the collection goes away, or the observer and queued ops outlive their usefulness. The registry itself is introspectable: `multiSelectors` maps selector to state, and `checkMultiSelectors()` forces the check the observer would schedule.

**Incorrect (what is wrong):**

```tsx
import { $collection } from "@hellajs/dom";

const badges = $collection(".badge");
badges.bind("live");

const fresh = document.createElement("span");
fresh.className = "badge";
document.body.append(fresh);

// Undefined: indexed access was snapshotted at creation - only the callable
// form sees dynamically added elements.
console.log(String(badges[1]?.node?.textContent));
```

**Correct (what is right):**

```tsx
import { $collection, checkMultiSelectors, multiSelectors } from "@hellajs/dom";

const badges = $collection(".badge");
badges.bind("live").on("click", () => void 0);

const fresh = document.createElement("span");
fresh.className = "badge";
document.body.append(fresh);
checkMultiSelectors(); // tests force what the observer schedules

console.log(String(badges(1)?.textContent), String(multiSelectors.size));

badges.dispose(); // stop watching; the observer disconnects when none remain
```

Reference: `packages/dom/lib/$collection.ts $collection` and `packages/dom/lib/internal/selectors.ts checkMultiSelectors` and `packages/dom/docs/api/collection.mdx`

### 6.2 WeakMap state access, queue counts, and resetDom between tests

**Impact: LOW** - storing per-element data on DOM nodes themselves fights the WeakMap design, and tests that skip resetDom leak observers and handlers across cases

Per-node state (effects, handlers, hooks, cleanup slots) lives in a WeakMap keyed by the DOM node - never on properties of the node itself. The exported accessors cover the lifecycle: `getState(node)` lazily creates `{ isMounted: false }`, `hasState(node)` checks presence, `peekState(node)` reads without creating, `deleteState(node)` drops the entry (cleanup does this for you - manual deletion skips disposers). For test and introspection work: `queueCounts()` reports the cleanup and mount queue depths - both drain to zero on the next microtask, and a nonzero mount count in an app without hooks means elements are being retained; `resetDom()` tears down all package mutable state (queues, observers, selector registry, delegated listeners, error handlers) and belongs in test teardown so cases stay isolated.

**Incorrect (what is wrong):**

```tsx
import { mount, component } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";

mount(() => component(App, {}) as TemplateBuildFn, "#app");
// State stashed on the node: invisible to cleanup, leaks across tests.
(document.getElementById("app") as Record<string, unknown>)["myState"] = { x: 1 };
```

**Correct (what is right):**

```tsx
import { getState, hasState, peekState, deleteState, queueCounts, resetDom } from "@hellajs/dom";

const node = document.createElement("div");
const state = getState(node); // creates the WeakMap entry
state.isMounted = true;
if (hasState(node)) peekState(node)?.effects?.push(() => void 0);

console.log(String(queueCounts().cleanup)); // drains to 0 on the microtask
deleteState(node); // drop the entry (cleanup normally owns this)
resetDom(); // test teardown: queues, observers, listeners, handlers
```

Reference: `packages/dom/lib/internal/state.ts getState` and `packages/dom/lib/internal/queue.ts queueCounts` and `packages/dom/lib/internal/reset.ts resetDom`

### 6.3 $ref ops queue until the element appears; element inputs never watch

**Impact: MEDIUM** - calling $ref(selector) before the element exists and then reading ref() gets null - operations only apply later if you actually issue them, and assuming an element input watches wastes a body observer

`$ref(selector)` runs `document.querySelector` synchronously: a hit wraps immediately, a miss returns a callable ref that is `null` until found. Operations (`bind`, `on`, `hooks`) queue and apply when a matching element appears - but the MutationObserver watch starts lazily on the FIRST operation call, so `const r = $ref("#x")` alone never watches anything. Chain at least one operation to arm the watcher. `$ref(element)` (a node already in hand) applies operations immediately and never starts a watcher; a null-ish runtime element input stays a safe queued no-op. Read the node through the call (`ref()`) or the `.node` getter rather than re-querying.

**Incorrect (what is wrong):**

```tsx
import { $ref } from "@hellajs/dom";

const late = $ref("#save-btn");
// No operation chained: no watcher started. When the button renders later,
// nothing binds - and late() reads null right now anyway.
if (late()) {
  void 0; // dead branch: the element does not exist yet
}
```

**Correct (what is right):**

```tsx
import { $ref } from "@hellajs/dom";

// The operation call arms the watcher: whenever #save-btn appears, the
// handler and attribute apply to it automatically.
$ref("#save-btn")
  .bind({ "data-armed": "true" })
  .on("click", () => void 0);

// Element already in hand: immediate, no watcher.
const host = document.createElement("div");
$ref(host).hooks({ afterMount: () => void 0 });
```

Reference: `packages/dom/lib/$ref.ts $ref` and `packages/dom/docs/api/ref.mdx`


## 7. Error handling

### 7.1 error: configs define boundaries; category alone is not one

**Impact: HIGH** - an element carrying only error:category is skipped by the boundary walk, so errors blow past it to an outer boundary or the console

`error:` attributes merge into the element's error config: `error:fallback` (a function returning a flagged build), `error:boundary` (boolean), and `error:category` (a string for filtering). An element becomes a boundary only when its config has `fallback` or `boundary` - when a dispatched error's origin walks up `parentElement`, a `category`-only config is passed over (it still populates `context.config`, so handlers can filter by it, but it never stops or renders anything). A boundary's `fallback` renders in place of the boundary element's content; `context.reset()` - present when the boundary is a compiled template root - re-invokes the stored build for fresh nodes. Nested errors resolve to the NEAREST qualifying boundary.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";

const region = signal("ok");
// The category-only config is not a boundary: a render error below sails
// through this wrapper to whatever boundary (if any) is above it.
const Shell = () => (
  <div error:category="dashboard">
    <output>{region}</output>
  </div>
);
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";

const region = signal("ok");
const Risky = () => <button>Go</button>;

// A real boundary: the fallback build renders into this element when any
// error below dispatches; the category lets handlers filter what they catch.
const Shell = () => (
  <div
    error:category="dashboard"
    error:boundary={true}
    error:fallback={(error: Error) => <p class="error">{error.message}</p>}
  >
    <Risky />
    <output>{region}</output>
  </div>
);
```

Reference: `packages/dom/lib/features/errors.ts` and `packages/dom/docs/api/error.mdx` and `packages/dom/docs/concepts/error-handling.mdx`

### 7.2 onError is the global drain: first non-null fallback build wins

**Impact: MEDIUM** - with no onError handler registered every dispatched error is just console.error with no UI change, and handler ordering surprises when several are registered

`onError(fn)` registers a global handler that sees every dispatched error - render, mount, update, and event phases - including the ones no boundary caught (async mount rejections have no element context and can only land here). Handlers run in insertion order; the FIRST handler returning a non-null flagged build wins and later handlers are skipped for that error - return `null` to pass, a build to render. Registering does not replace: `onError(fn)` adds, the returned function removes that one handler, and `onError(null)` clears every handler. An error thrown inside a handler is caught and logged (`[dom] Error handler threw:`), never re-dispatched.

**Incorrect (what is wrong):**

```tsx
import { mount, onError } from "@hellajs/dom";

// Registered after mounting async roots, and returns a build for EVERYTHING -
// later, more specific handlers never see an error this one swallows.
mount(async () => loadApp(), "#app");
onError((error) => () => <p>{error.message}</p>);
```

**Correct (what is right):**

```tsx
import { onError } from "@hellajs/dom";

// Registered before any mount; passes on event-phase errors so a later
// handler (or telemetry-only default) still sees them.
onError((error, context) => {
  if (context.phase === "event") return null;
  return <p role="alert">{error.message}</p>; // a JSX build is the flagged fn
});

onError(null); // test teardown: clears every handler (pair with resetDom)
```

Reference: `packages/dom/lib/features/errors.ts onError` and `packages/dom/docs/api/onerror.mdx`


## 8. Cleanup and teardown

### 8.1 Never hand-mutate mounted DOM; write signals instead

**Impact: CRITICAL** - manual writes to rendered nodes are overwritten by the next reactive update or missed by cleanup tracking - the reconciler owns that DOM, and it will not negotiate

HellaJS does no diffing - every rendered reactive value is owned by an effect that writes it, and every managed node carries state the cleanup system tracks. Grabbing a rendered element and mutating it by hand (`el.textContent = ...`, `el.appendChild(...)`, `el.setAttribute(...)`) fights both owners: the next signal write overwrites your change without warning, and nodes you inserted yourself carry no state, so their effects and handlers leak when the region cleans up. Route every visible change through the reactive system - write the signal, flip the conditional, update the list. The imperative escape hatch over DOM HellaJS did NOT render (or explicitly hands you - `$ref` targets, portal targets) is what `$ref`/`$collection` are for.

**Incorrect (what is wrong):**

```tsx
import { mount, component } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";
import { signal } from "@hellajs/core";

const count = signal(0);
const App = () => <output>{count}</output>;
mount(() => component(App, {}) as TemplateBuildFn, "#app");

// Hand-write into the reconciler's output: the next count write overwrites
// it, and nothing reactive knows this happened.
(document.querySelector("output") as HTMLElement).textContent = "42";
```

**Correct (what is right):**

```tsx
import { mount, component } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";
import { signal } from "@hellajs/core";

const count = signal(0);
const App = () => <output>{count}</output>;
mount(() => component(App, {}) as TemplateBuildFn, "#app");

// The same change through the owner: the effect updates the text node.
count(42);
```

Reference: `packages/dom/lib/internal/render.ts` and `packages/dom/lib/internal/cleanup.ts` and `packages/dom/docs/concepts/reactive-refs.mdx`

### 8.2 Removal disposes reactivity on the next microtask; unmount is synchronous

**Impact: MEDIUM** - deleting nodes and immediately asserting disposed state fails - the scoped MutationObserver cleans up on a microtask - and skipping teardown in long-lived pages accumulates ghost effects

Cleanup is removal-driven: a scoped MutationObserver watches every mount container, and a managed node removed from the DOM (your `el.remove()`, a `replaceChildren`, a list clear) has its effects disposed, handlers removed, and hooks fired on the NEXT microtask - `beforeDestroy`/`afterDestroy` assertions must await a tick after removal. The `MountHandle` from `mount`/`hydrate` short-circuits that: `handle.unmount()` cleans and detaches every root synchronously, and `handle.flush()` drains pending cleanup queues on demand. Content Portal moved into remote targets is covered through the portal's anchor tracking, not the container observer - remove the portal's source region, not the remote nodes. `queueCounts()` is the probe: both counts return to zero after the microtask drain; in tests, `resetDom()` between cases resets observers and queues wholesale.

**Incorrect (what is wrong):**

```tsx
import { mount, component } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";

const handle = mount(() => component(App, {}) as TemplateBuildFn, "#app");
document.getElementById("app")?.replaceChildren();
// Asserting disposal NOW fails: the observer has not run its microtask yet.
```

**Correct (what is right):**

```tsx
import { mount, component } from "@hellajs/dom";
import type { TemplateBuildFn } from "@hellajs/dom";

const App = () => <p>Disposable content</p>;
const handle = mount(() => component(App, {}) as TemplateBuildFn, "#app");

// Synchronous teardown of the whole tree: no microtask wait, no manual walks.
handle.unmount();
```

Reference: `packages/dom/lib/internal/queue.ts processCleanupQueue` and `packages/dom/lib/internal/handle.ts` and `packages/dom/docs/api/mount.mdx`


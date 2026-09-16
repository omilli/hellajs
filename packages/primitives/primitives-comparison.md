# HellaJS @hellajs/primitives vs. Radix Primitives / Base UI / Zag

A ground-up comparison based on the actual source code of `@hellajs/primitives` v2. Every claim below was verified against `packages/primitives/lib/`. Competitor versions researched: Radix Primitives (`@radix-ui/react-dialog` 1.1.23; the focus/dismissal/roving internals at 1.1.16 through 1.1.19), Base UI (`@base-ui/react` 1.8.0), Zag (1.44.0).

---

## 1. At-a-Glance Summary

| Dimension | HellaJS primitives | Radix Primitives | Base UI | Zag |
|---|---|---|---|---|
| API shape | Behavior functions over real DOM nodes | React component parts (Root/Trigger/Content) | React component parts + composition hooks | State machines + behavior utilities |
| Framework coupling | None: plain DOM, no render tree required | React only (react, react-dom peers) | React only (react, react-dom ^17 \|\| ^18 \|\| ^19 peers) | Adapter per framework: React, Solid, Vue, Svelte |
| State ownership | Caller signals: behaviors hold zero state | Component state, controlled or uncontrolled props | Component state, controlled or uncontrolled props | Machine (actor) state, config-driven |
| Surface size | 4 functions + 2 option types (`lib/index.ts`) | 30+ documented components | ~35 components, single tree-shakable package | ~60 component machines + utilities |
| Focus trap | Public `trapFocus` (`lib/trapFocus.ts`) | Internal FocusScope, auto in modal Dialog | Internal to Dialog/Popover | Public `@zag-js/focus-trap` utility + in-machine |
| Outside press / Escape | Public `onOutside` / `onEscape` (`lib/onOutside.ts`, `lib/onEscape.ts`) | Internal DismissableLayer with interception props | Internal to components | Public `@zag-js/dismissable` + in-machine |
| Roving tabindex | Public `rovingTabIndex` (`lib/rovingTabIndex.ts`) | Internal RovingFocusGroup drives Tabs/Toolbar | Internal to Tabs/Toolbar/Toggle Group | In-machine (Tabs, Toolbar, Toggle Group) |
| Runtime deps | 0 | 0 (React peers) | 0 (React peers) | 4 in the React adapter (`@zag-js/core` and siblings) |
| Disposal | Every call returns a dispose handle | Component unmount | Component unmount | Machine stop / hook cleanup |

HellaJS primitives is the only entry whose entire surface is the wiring layer itself: the focus trap, the dismissal listeners, and the roving group are the public API, not machinery hidden under components. Radix and Base UI sell assembled components and keep these behaviors internal; Zag sells machines and keeps the same behaviors as utilities inside its ecosystem. The trade is direct: HellaJS gives you the wiring with no framework and no state model attached, and you build the component; the others give you the component and hide the wiring.

---

## 2. Behavior Model: Functions, Parts, and Machines

### HellaJS

The package is a wiring layer, not a component kit: plain functions that accept nodes, attach listeners, and hand back disposal. The surface is deliberate and small:

- The four exports are `trapFocus(container, options?)`, `onEscape(target, handler)`, `onOutside(targets, handler)`, and `rovingTabIndex(container, options?)`, plus the two option types (`lib/index.ts`, `lib/types.d.ts`).
- No component wrapper, no props object, no render-tree dependency. The functions accept any `Node` or `ParentNode`, so they compose with HellaJS templates (`hook:` prefixes hand over the element), with static HTML via `$ref`, or with no HellaJS at all (`lib/trapFocus.ts`, `lib/onEscape.ts`).
- Every function attaches its listeners directly and returns `() => void` that removes them and undoes DOM mutations; `rovingTabIndex` snapshots original `tabindex` attributes at setup and restores them on dispose (`lib/rovingTabIndex.ts`).
- Input validation is uniform: every function throws `[primitives] <fn>: <param> is required` on null or undefined arguments (`lib/trapFocus.ts`, `lib/onEscape.ts`, `lib/onOutside.ts`, `lib/rovingTabIndex.ts`).

### Radix Primitives

Radix is a React component library: each primitive is a set of parts (`Dialog.Root`, `Dialog.Trigger`, `Dialog.Portal`, `Dialog.Overlay`, `Dialog.Content`, `Dialog.Title`, `Dialog.Description`) that render markup and own behavior at once (per the Radix Dialog docs). The behaviors this package exposes are inside Radix as internal npm packages: `@radix-ui/react-focus-scope` (1.1.16), `@radix-ui/react-dismissable-layer` (1.1.19), and `@radix-ui/react-roving-focus` (1.1.19), all carrying React peers (per the npm registry). None appears in the public docs navigation: they are implementation details of Dialog, Popover, Tabs, Toolbar, and Toggle Group.

### Base UI

Base UI (from the MUI team) ships the same parts model in a single tree-shakable package with subpath imports (`@base-ui/react/popover`, per the Base UI quick start). Portals, positioning, and focus management live inside the components; composition beyond the parts goes through utilities like `useRender` and `mergeProps` (per the Base UI docs navigation). React is the only target (peers `react` and `react-dom` ^17 || ^18 || ^19, per the npm registry).

### Zag

Zag inverts the model with finite state machines: component logic lives in framework-agnostic machines, and per-framework adapters (`@zag-js/react`, `@zag-js/solid`, `@zag-js/vue`) provide the hooks (`useMachine`), with `machine + connect` turning state into props getters spread onto your own elements (per the Zag introduction). Its behavior layer is the closest sibling to HellaJS: `@zag-js/focus-trap` exports `trapFocus(element, { initialFocus, returnFocusOnDeactivate })` returning a restore function, the same function-plus-handle shape as HellaJS (per the Zag focus-trap docs).

**Verdict:** Two axes separate the group: who owns markup (you vs the parts) and where state lives (caller vs component vs machine). HellaJS is the pure-wiring corner: no markup, no state, no framework. Zag is the closest sibling on wiring (its utilities share the dispose-handle shape) but wraps a machine ecosystem around it. Radix and Base UI are assembled-component libraries where the wiring is not a public surface at all.

---

## 3. Dependencies

| | HellaJS (primitives) | Radix Primitives | Base UI | Zag |
|---|---|---|---|---|
| Runtime deps | 0 | 0 (per primitive package) | 0 | 4 in `@zag-js/react` (`@zag-js/core`, `store`, `types`, `utils`); utilities add `@zag-js/dom-query` and siblings |
| Peer deps | 0 | `react`, `react-dom` (per primitive) | `react`, `react-dom` ^17 \|\| ^18 \|\| ^19 | `react` >= 18 (React adapter) |

- `@hellajs/primitives` declares zero dependencies and zero peerDependencies by design: state stays in caller signals and the functions touch only DOM APIs (`package.json`). Nothing else in this group runs without a framework attached.
- Distribution is per-behavior subpath exports plus a `bundle` entry (`package.json`), so a copy/paste registry component can import one function without pulling the rest.
- Radix splits across dozens of per-primitive npm packages (Dialog, Popover, Tabs each install separately, per the npm registry); Base UI is one package with subpath exports; Zag is one package per machine plus an adapter package. HellaJS is the only one where the unit of distribution is smaller than a component.

---

## 4. Focus Trapping

### HellaJS

`trapFocus` listens for Tab keydowns on `document` in the capture phase and wraps focus at the edges: Tab from the last focusable moves to the first, Shift+Tab from the first to the last (`lib/trapFocus.ts`). Three properties are worth naming:

- Focusables are re-queried on every keypress via the shared collector (`lib/internal/focusables.ts`), so controls rendered later join the trap without rewiring.
- `initialFocus` is a getter resolved once at trap time; `restoreFocus` (default true) captures `document.activeElement` before the initial focus lands and refocuses it when the handle runs (`lib/trapFocus.ts`).
- The wrap only intercepts when `activeElement` is exactly the first or last focusable; focus elsewhere inside the container falls through to native Tab behavior (`lib/trapFocus.ts`).

### Radix Primitives

FocusScope is the internal engine (npm `@radix-ui/react-focus-scope` 1.1.16). At the component level, modal Dialog "automatically" traps focus (per the Radix Dialog docs), and `onOpenAutoFocus` / `onCloseAutoFocus` props intercept where focus lands. The trap is not consumable outside Radix components.

### Base UI

Focus trapping lives inside Dialog, Popover, and Menu parts (per the Base UI component docs); the quick start shows portals and stacking-context setup as the consumer-facing surface. No public trap function exists.

### Zag

`@zag-js/focus-trap` is a public utility with the same call shape as HellaJS: `trapFocus(element, { initialFocus, returnFocusOnDeactivate })` returning a restore function (per the Zag focus-trap docs). It additionally handles hidden elements, shadow DOM, nested focus traps, and `aria-controls` elements, at the cost of a `@zag-js/dom-query` dependency (per the npm registry and Zag docs).

**Verdict:** Zag matches the shape and exceeds the coverage: nested traps, shadow DOM traversal, and hidden-element recovery are cases HellaJS does not handle (`lib/trapFocus.ts` intercepts only the two edge cases, and `getFocusables` does not pierce shadow roots, `lib/internal/focusables.ts`). HellaJS answers with the zero-dependency edge: 47 lines of plain DOM with no resolution machinery, and per-keypress re-querying keeps the trap correct for dynamically rendered controls with no observer of its own.

---

## 5. Escape and Outside-Press Dismissal

### HellaJS

- `onEscape(target, handler)` attaches a bubble-phase keydown on the target itself and fires only on `key === "Escape"` (`lib/onEscape.ts`).
- `onOutside(targets, handler)` attaches a capture-phase pointerdown on `document` and re-invokes the `targets` getter on every event, skipping null entries and ignoring presses inside any resolved node (`lib/onOutside.ts`). The getter is the whole trick: portal content and conditionally rendered panels re-resolve per press without rewiring, and an unmounted portal (`null` in the array) is skipped rather than counted as outside.

### Radix Primitives

DismissableLayer (npm `@radix-ui/react-dismissable-layer` 1.1.19) powers dismissal across Dialog, Popover, and DropdownMenu, exposing interception props on the parts: `onEscapeKeyDown`, `onPointerDownOutside`, `onInteractOutside` (per the Radix Dialog docs). Escape closes the dialog and returns focus to the trigger automatically.

### Base UI

Dismissal is built into the parts with the same interception prop family (per the Base UI Dialog docs). As with focus, there is no standalone surface.

### Zag

`@zag-js/dismissable` is the public utility (with `@zag-js/interact-outside` underneath, per the npm registry); machines also wire dismissal events into their state transitions (per the Zag docs).

**Verdict:** All four solve the same gesture pair; the difference is again the surface. HellaJS splits the two gestures into two one-line functions and leaves coordination (close both on either gesture) to a shared dispose array in caller code. Radix and Base UI bundle dismissal with focus return and layer stacking into one component close path; Zag bundles it into machine transitions.

---

## 6. Roving Tabindex

### HellaJS

`rovingTabIndex` sets `tabindex=0` on the first item and `-1` on the rest at setup (never stealing focus), then on each keydown resolves the group via `indexOf(activeElement)` and returns early when focus is outside the group (`lib/rovingTabIndex.ts`). Arrow keys move focus along the active orientation (both axes when unset), Home and End jump to the ends, `loop` (default true) wraps or clamps, and every move writes the roving `0` onto the target and `-1` onto the rest (`lib/rovingTabIndex.ts`). Disposal restores each item's original attribute from an init-time snapshot, including removing `tabindex` where it never existed (`lib/rovingTabIndex.ts`). A `selector` option overrides the default focusable collector for non-natively-focusable items (`lib/types.d.ts`).

### Radix Primitives

RovingFocusGroup (npm `@radix-ui/react-roving-focus` 1.1.19) is the internal engine behind Tabs, Toolbar, Toggle Group, and Radio Group (per the npm registry; absent from the public docs navigation). It is not consumable standalone.

### Base UI

Tabs, Toolbar, and Toggle Group implement arrow-key navigation internally (per the Base UI component docs).

### Zag

The same patterns ship inside the Tabs, Toolbar, and Toggle Group machines, where roving is part of the machine's keyboard transitions (per the Zag docs).

**Verdict:** Roving is where HellaJS is most alone: none of the competitors exposes a standalone roving-tabindex function. The honest limitation is the interaction between the default collector and roving's own writes: `getFocusables` excludes `tabindex="-1"`, and roving writes `-1` onto inactive items, so items collected only via a tabindex attribute (spans, not natively focusable) drop out of the default group after the first move and need an explicit `selector` (`lib/internal/focusables.ts`, `lib/rovingTabIndex.ts`). Natively focusable items stay collected because the selector arms match them regardless of tabindex.

---

## 7. State Ownership and Framework Integration

### HellaJS

The behaviors hold zero state: which panel is open, which tab is active, whether the menu is dismissed all live in caller signals, and the behaviors read that state through callbacks and getters (`lib/onOutside.ts` never learns what a portal is; it re-invokes the getter and trusts the nodes). The natural HellaJS wiring is `hook:afterMount` to start a behavior on the element and `hook:beforeDestroy` to dispose (per the package README), or `$ref` / `$collection` for markup the app did not render.

### Radix Primitives / Base UI

State lives in the component, exposed as controlled or uncontrolled props (per the Radix Dialog docs; Base UI follows the same convention). Escape and outside-press handlers are interception points on a close the component already performs.

### Zag

State is the machine: config options and events drive transitions, and `connect` derives props from the current state (per the Zag introduction). The behavior functions of this package correspond to what Zag machines internalize as events like `pointerDownOutside` and `escapeKeyDown`.

**Verdict:** This is the load-bearing split. HellaJS behaviors compose into any state model, including none; Radix and Base UI require React state conventions; Zag requires buying the machine model to get the assembled behavior, though its utilities can be used alone.

---

## 8. Built-in Features Matrix

| Feature | HellaJS | Radix Primitives | Base UI | Zag |
|---|---|---|---|---|
| Standalone focus trap | Yes (`lib/trapFocus.ts`) | Internal only (FocusScope) | Internal only | Yes (`@zag-js/focus-trap`) |
| Standalone outside-press / Escape | Yes (`lib/onOutside.ts`, `lib/onEscape.ts`) | Internal only (DismissableLayer) | Internal only | Yes (`@zag-js/dismissable`) |
| Standalone roving tabindex | Yes (`lib/rovingTabIndex.ts`) | No public surface | No public surface | No public surface |
| Focus restore on close | Yes, default on (`lib/trapFocus.ts`) | Yes, `onCloseAutoFocus` customizable | Yes, in components | Yes, `returnFocusOnDeactivate` |
| Dynamic content re-query | Per keypress / per press (`lib/trapFocus.ts`, `lib/onOutside.ts`) | Via layer composition | Via parts | Via machine events |
| Orientation / loop control | Both options (`lib/types.d.ts`) | Via RovingFocusGroup internals | Per component | Per machine |
| Home / End jumps | Yes (`lib/rovingTabIndex.ts`) | Yes (in components) | Yes (in components) | Yes (in machines) |
| Nested traps | No | Yes (FocusScope stacking) | Yes (in components) | Yes (focus-trap utility) |
| Shadow DOM traversal | No | Yes | Yes | Yes |
| ARIA attributes provided | No: wiring only | Yes (parts set roles/ids) | Yes | Yes (`connect` getters) |
| Framework adapters | None needed (plain DOM) | React | React | React, Solid, Vue, Svelte |
| Works without a framework | Yes | No | No | Partially (utilities, not machines) |

### Notable HellaJS differentiators

- Getter targets re-resolved per pointerdown: portal and dynamic content stay correct without rewiring, and null entries are skipped rather than counted as outside (`lib/onOutside.ts`).
- Dispose handles restore the DOM, not just the listeners: `rovingTabIndex` returns every item to its original `tabindex` attribute from an init-time snapshot, and `trapFocus` returns focus to the pre-trap `activeElement` (`lib/rovingTabIndex.ts`, `lib/trapFocus.ts`).
- Zero dependencies and zero peers: the wiring layer is importable from any stack, framework or none (`package.json`).
- Re-query per event: both trap and roving re-resolve their groups on every keypress, so added or removed controls join without observers (`lib/trapFocus.ts`, `lib/rovingTabIndex.ts`).
- Uniform throw contracts: every function validates with `[primitives] <fn>: <param> is required` before touching the DOM (`lib/trapFocus.ts`, `lib/onEscape.ts`, `lib/onOutside.ts`, `lib/rovingTabIndex.ts`).

---

## 9. Ergonomics & Syntax

One wiring pattern for every behavior: start on mount, dispose on close or unmount:

```jsx
import { signal } from "@hellajs/core";
import { mount } from "@hellajs/dom";
import { trapFocus, onEscape, onOutside } from "@hellajs/primitives";

const open = signal(false);
const cleanup: (() => void)[] = [];
const close = () => {
  open(false);
  cleanup.forEach((dispose) => dispose());
  cleanup.length = 0;
};

const Dialog = () => (
  <div
    class="panel"
    role="dialog"
    hook:afterMount={(node) => {
      if (!(node instanceof HTMLElement)) return;
      cleanup.push(
        trapFocus(node),
        onEscape(node, close),
        onOutside(() => [node], close)
      );
    }}
  >
    <button on:click={close}>Close</button>
  </div>
);
```

The API is three function signatures and one convention (the dispose handle); there are no parts to assemble, no props-getter spreads, and no config objects beyond two option types (`lib/types.d.ts`). Against Radix and Base UI, the difference is who writes the markup: their parts render the dialog and own its close logic, which is faster to adopt and harder to reshape; HellaJS behaviors assume your markup exists and add only the wiring. Against Zag, the difference is the abstraction level: `machine + connect + normalizeProps` buys declarative transitions at the price of the machine runtime, while these functions are imperative one-liners. The dispose-array pattern above is manual bookkeeping that components do for you; it is the cost of the layer staying dependency-free.

---

## Bottom Line

HellaJS primitives occupies the pure-wiring corner of the headless landscape: the focus trap, dismissal listeners, and roving group as four dependency-free functions over real DOM nodes, with state left entirely to caller signals. Radix and Base UI sit at the opposite corner, assembled React components that hide this wiring completely; Zag straddles the middle, exposing behavior utilities like HellaJS while steering consumption toward its machine ecosystem.

What sets HellaJS apart (and no single competitor matches all of):

1. **The wiring is the public API**: trap, dismiss, and rove are first-class functions, including the only standalone roving tabindex in the group (`lib/rovingTabIndex.ts`).
2. **Zero dependencies, zero peers, no framework**: importable into any stack or none, the layer a copy/paste registry builds on (`package.json`).
3. **Getter-target outside press**: portals and dynamic content re-resolve per event, null entries skipped, no rewiring (`lib/onOutside.ts`).
4. **Restoring disposal**: dispose handles undo DOM mutations, restoring original tabindex attributes and pre-trap focus, not just removing listeners (`lib/rovingTabIndex.ts`, `lib/trapFocus.ts`).

Its gaps are real: the trap handles only edge wrapping (no pull-back when focus lands outside the container, no nested traps, no shadow DOM traversal; `lib/trapFocus.ts`, `lib/internal/focusables.ts`), the default focusable collector interacts with roving's own `-1` writes so tabindex-collected items need an explicit selector (`lib/internal/focusables.ts`), no ARIA attributes are provided (roles and ids remain the caller's job, where competitors' parts and `connect` getters supply them), and the catalog is four behaviors against Radix's and Base UI's dozens of assembled components and Zag's ~60 machines. Escaping a dismissal gesture or redirecting focus at close time is a Radix/Base UI prop; here it is code you write around the handler you pass in.

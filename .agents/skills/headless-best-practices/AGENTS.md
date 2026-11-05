# headless-best-practices

Compiled by `vp run skills-build` from `rules/` - never hand-edit; regenerate instead.

Best practices for @hellajs/headless, the behavior package: renderer-free wiring utils (focus traps, dismissal layers, anchor positioning, hover timing, pointer gestures) plus the headless component factories - popover, dialog, menu, tooltip, combobox, select, command, toggles, tabs, toast, calendar, form - that render structure, never styles, with state in the caller's signals. Every rule is grounded in the package source and test suite.

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
- 1. Utils entry and dispose handles
  - 1.1 Call every util's dispose handle on teardown (`util-dispose-handles`)
  - 1.2 Import utils from the headless/utils subpath (`util-utils-subpath`)
- 2. Interaction primitives
  - 2.1 Match hoverIntent pointerOnly and menuTypeahead getters to the surface (`int-hover-typeahead`)
  - 2.2 Pass live getters where onOutside and layerDismissal expect them (`int-outside-getters`)
  - 2.3 Give rovingTabIndex a selector for non-natively-focusable items (`int-roving-tabindex`)
  - 2.4 Release trapFocus and let it own Tab wrapping (`int-trap-focus`)
- 3. Anchor positioning
  - 3.1 Use anchorPosition for live fixed overlays (`pos-anchor-live-overlay`)
  - 3.2 Read placements as flip-then-clamp with direction-aware start and end (`pos-placement-resolution`)
- 4. Pointer gestures
  - 4.1 Consumers own drag value math and touch-action (`gest-drag-cumulative`)
  - 4.2 Track two-pointer pinches with onPinch; press timers fire only when configured (`gest-pinch-and-press`)
  - 4.3 Gate swipe actions on commit, not on move (`gest-swipe-commit`)
- 5. Layered dismissal and modality
  - 5.1 Dispose the layer inside the layerDismissal handler (`layer-dismissal-stack`)
  - 5.2 Arm modal panels with modal, not hand-rolled traps (`layer-modal-arming`)
- 6. Component factories
  - 6.1 Select calendar values in the mode's shape (`comp-calendar`)
  - 6.2 Keep tabs and accordion content mounted under data-state (`comp-disclosure-family`)
  - 6.3 Let open surfaces exit through animationend under data-state (`comp-exit-machine`)
  - 6.4 Call factories in component scope and keep portaled Content under a mounted root (`comp-factory-scope-portal`)
  - 6.5 Drive forms through the createForm controller signals (`comp-form`)
  - 6.6 Let inputOtp own the caret and read the code through its value (`comp-input-otp`)
  - 6.7 Key listbox options by value through the factory members (`comp-listbox-family`)
  - 6.8 Compose menus from MenuRows, menuSub, and menubar (`comp-menu-family`)
  - 6.9 Coordinate navigation menu panels through the root announcements (`comp-navigation-menu`)
  - 6.10 Use the press factories for toggles, checkboxes, and groups (`comp-press-family`)
  - 6.11 Compose scrollArea and messageScroller through their members (`comp-scroll-surfaces`)
  - 6.12 Drive slider values as thumb arrays and commit on release (`comp-slider`)
  - 6.13 Mount one Toaster and drive toasts through the module API (`comp-toast-singleton`)
  - 6.14 Use tooltip and hoverCard for hover surfaces with their timing defaults (`comp-tooltip-hover`)
- 7. State ownership
  - 7.1 A controlled accessor reports; it never flips internal state (`state-controlled-accessor`)
  - 7.2 Keep state in your signals; factories return parts (`state-signals-not-factories`)

## 1. Utils entry and dispose handles

### 1.1 Call every util's dispose handle on teardown

**Impact: CRITICAL** - trapFocus, onOutside, hoverIntent, and layerDismissal listen on document and anchorPosition on window - a discarded handle leaks live global listeners against detached nodes

Every wiring util returns a dispose handle, and the heaviest listeners sit on `document` (`trapFocus`, `onOutside`, `hoverIntent`, `layerDismissal`) or `window` (`anchorPosition`) - the wiring outlives the observed element, so removing the element does not remove the listener. A discarded handle leaks a global listener that keeps firing against detached closures for the rest of the app. Store the handle at arming time and call it in the path that closes or tears the surface down: the dismissal handler itself, the owning effect's cleanup, or an unmount hook. The component factories arm and drain these for you - manual arming is the case that must clean up after itself.

**Incorrect (what is wrong):**

```ts
import { onOutside } from "@hellajs/headless/utils";

// Handle discarded: the document pointerdown listener stays armed forever;
// every future outside press invokes a handler over a dead panel.
onOutside(() => [panel()], () => close());
```

**Correct (what is right):**

```ts
import { onOutside } from "@hellajs/headless/utils";

const openPanel = (panel: HTMLElement) => {
  const dismiss = onOutside(() => [panel], () => {
    panel.hidden = true;
    dismiss(); // the handler owns its teardown
  });
  panel.hidden = false;
};
```

Reference: `packages/headless/lib/utils/onOutside.ts` and `packages/headless/tests/onoutside.test.ts`

### 1.2 Import utils from the headless/utils subpath

**Impact: MEDIUM** - importing utils through the package root drags the dom-dependent component-factory tier into renderer-free surfaces

`@hellajs/headless/utils` re-exports the fifteen wiring utils (`trapFocus` through `modal`); the package root additionally exports the component-factory tier (`popover`, `menu`, `combobox`, ...), which imports `@hellajs/dom` for portals and rendering. The utils tier is deliberately kept renderer-free for wiring over real DOM nodes - only `modal` touches dom, for node-scoped disposal. Util-only consumers (script augmentations, editor toolbars, code that must not pull a renderer) import from the subpath; importing a util through the root works but links the whole factory surface into the module graph.

**Incorrect (what is wrong):**

```ts
import { onEscape } from "@hellajs/headless";

// Resolves, but links popover/dialog/menu/combobox/... and their
// @hellajs/dom dependency graph into a surface that only dismisses a panel.
const dismiss = onEscape(panel, () => hide());
```

**Correct (what is right):**

```ts
import { onEscape } from "@hellajs/headless/utils";

const armPanel = (panel: HTMLElement, hide: () => void) => onEscape(panel, hide);
```

Components stay on the root entry: `import { popover } from "@hellajs/headless"`.

Reference: `packages/headless/lib/utils/index.ts` and `packages/headless/docs/concepts/headless-utils.mdx`


## 2. Interaction primitives

### 2.1 Match hoverIntent pointerOnly and menuTypeahead getters to the surface

**Impact: MEDIUM** - focus arming auto-opens submenu triggers under roving focus, and a captured item list makes typeahead jump to removed rows

`hoverIntent(target, handlers)` opens after `openDelay` (default 700) and closes after `closeDelay` (default 300); `focus`/`blur` arms are included by default for keyboard parity - pass `pointerOnly: true` for surfaces where roving focus must not auto-open (menu sub-triggers; the factories set it there). A module-level skip-delay window makes any open within the previous 500ms instant, shared across ALL consumers so moving between adjacent triggers never re-incurs the delay; `resetHeadless()` clears it for tests. When the surface can open without hover (a click-opened sub-trigger), pass `isOpen` so leave and outside-dismiss still schedule the close. `menuTypeahead(container, resolveItems, onSelect)` re-invokes `resolveItems` per keystroke - return the live rows, never a captured array; printable keys buffer with a 500ms auto-reset, `startsWith` matches case-insensitively first, then substring matching wraps from the item after the last selection.

**Incorrect (what is wrong):**

```ts
import { hoverIntent } from "@hellajs/headless/utils";

// Without pointerOnly, arrow-key roving across the parent menu fires the
// focus arm and every submenu the rove passes over opens.
const dispose = hoverIntent(subTrigger, { onOpen: openSub, onClose: closeSub });
```

**Correct (what is right):**

```ts
import { hoverIntent, menuTypeahead } from "@hellajs/headless/utils";

const armSubmenu = (subTrigger: HTMLElement, menuEl: HTMLElement) => {
  const disposeHover = hoverIntent(subTrigger, {
    onOpen: () => subTrigger.setAttribute("data-state", "open"),
    onClose: () => subTrigger.setAttribute("data-state", "closed"),
    openDelay: 100,
    closeDelay: 300,
    pointerOnly: true, // roving focus must not auto-open submenus
  });
  const disposeTypeahead = menuTypeahead(
    menuEl,
    () =>
      Array.from(menuEl.querySelectorAll<HTMLElement>("[role='menuitem']")).map((node) => ({
        node,
        text: node.textContent ?? "",
      })),
    (item) => item.node.focus(),
  );
  return () => {
    disposeHover();
    disposeTypeahead();
  };
};
```

Reference: `packages/headless/lib/utils/hoverIntent.ts` and `packages/headless/lib/utils/menuTypeahead.ts` and `packages/headless/tests/menutypeahead.test.ts`

### 2.2 Pass live getters where onOutside and layerDismissal expect them

**Impact: CRITICAL** - a call-time node snapshot freezes membership - recreated portal content counts as outside and the layer instantly dismisses itself

`onOutside(targets, handler)` re-invokes the `targets` getter on every pointerdown and `layerDismissal(nodes, onDismiss)` re-invokes `nodes` per event - that re-resolution is the contract that keeps portal and dynamically recreated content inside. Closing over an array resolved once at wiring time (calling a ref getter at arming time and capturing its result) freezes membership: the moment the overlay recreates its node, the stale entry no longer `.contains` the press target and every press inside the new content fires the dismissal. Null entries are skipped on purpose - return `null` for not-yet-mounted members instead of dropping them from the array.

**Incorrect (what is wrong):**

```ts
import { onOutside } from "@hellajs/headless/utils";

// Snapshot: panel() resolved once, at wiring time. After the portal
// recreates the panel node, every press inside it reads as outside.
const inside = [panel()];
const dismiss = onOutside(() => inside, () => close());
```

**Correct (what is right):**

```ts
import { onOutside } from "@hellajs/headless/utils";

// Getter: re-resolved per pointerdown, so recreated portal content stays
// inside; null entries (nothing mounted yet) are skipped.
const arm = (
  overlay: () => HTMLElement | null,
  anchor: () => HTMLElement | null,
  close: () => void,
) => onOutside(() => [overlay(), anchor()], close);
```

Reference: `packages/headless/lib/utils/onOutside.ts` and `packages/headless/lib/utils/layerDismissal.ts`

### 2.3 Give rovingTabIndex a selector for non-natively-focusable items

**Impact: HIGH** - the default collector excludes tabindex="-1", so rove-written marks drop tab-indexed spans out of the group after the first move

`rovingTabIndex(container, options?)` writes `tabindex` 0 on the first item and -1 on the rest at init (never stealing focus), moves focus along the `orientation` axis on arrows, jumps on Home/End, and wraps when `loop` (default true). Arrows act only while focus is inside the group - the keydown resolves the current item by `indexOf(activeElement)` and ignores a `-1` - so the group must actually receive focus before arrows do anything. The default item collector is the shared focusables selector (`a[href]`, enabled form controls, `[tabindex]:not([tabindex="-1"])`): items collected only through their tabindex attribute (spans, divs) drop out after the first move writes -1 onto them, collapsing the rove. Pass `selector` for such groups; natively focusable items survive the -1 writes. The dispose handle restores every item's original attribute.

**Incorrect (what is wrong):**

```ts
import { rovingTabIndex } from "@hellajs/headless/utils";

// Spans collected only via tabindex: the first arrow move writes -1 onto
// the inactive items, the default collector drops them, and the rove
// collapses to a single item.
const toolbar = document.createElement("div");
toolbar.innerHTML = "<span tabindex='0'>Cut</span><span tabindex='0'>Copy</span>";
const dispose = rovingTabIndex(toolbar);
```

**Correct (what is right):**

```ts
import { rovingTabIndex } from "@hellajs/headless/utils";

const toolbar = document.createElement("div");
toolbar.innerHTML =
  "<span data-tool tabindex='0'>Cut</span><span data-tool tabindex='0'>Copy</span>";
const dispose = rovingTabIndex(toolbar, { selector: "[data-tool]", loop: true });
dispose(); // restores each item's original tabindex attribute
```

Reference: `packages/headless/lib/utils/rovingTabIndex.ts` and `packages/headless/lib/internal/focusables.ts` and `packages/headless/tests/rovingtabindex.test.ts`

### 2.4 Release trapFocus and let it own Tab wrapping

**Impact: HIGH** - stacking a manual Tab handler on the trap double-wraps focus, and a never-released trap pins keyboard focus on a detached panel

`trapFocus(container, options?)` focuses `initialFocus()`'s result (or the first focusable) at trap time, intercepts Tab only when `activeElement` is exactly the first or last focusable (wrapping forward from the last, backward from the first), re-queries focusables on every keypress so dynamic children join the trap, and restores the pre-trap `activeElement` on release unless `restoreFocus: false`. Focus elsewhere inside falls through to the native Tab order, and pull-back from outside the container is deliberately absent. Do not stack a second Tab keydown handler on a trapped container - both call `preventDefault` and their focus targets disagree. Release the handle when the surface closes, or use `modal`/`dialog` which own the trap's lifecycle.

**Incorrect (what is wrong):**

```ts
import { trapFocus } from "@hellajs/headless/utils";

// A manual Tab wrapper next to the trap: both handlers preventDefault and
// disagree on the focus target, and the trap is never released.
trapFocus(panel);
panel.addEventListener("keydown", (event) => {
  if (event.key !== "Tab") return;
  event.preventDefault();
  panel.querySelector<HTMLElement>("button")!.focus();
});
```

**Correct (what is right):**

```ts
import { trapFocus } from "@hellajs/headless/utils";

const panel = document.createElement("div");
const release = trapFocus(panel, {
  initialFocus: () => panel.querySelector<HTMLElement>("[data-autofocus]") ?? undefined,
});
const close = (): void => {
  release(); // restores the pre-trap activeElement
  panel.remove();
};
```

Reference: `packages/headless/lib/utils/trapFocus.ts` and `packages/headless/tests/trapfocus.test.ts`


## 3. Anchor positioning

### 3.1 Use anchorPosition for live fixed overlays

**Impact: HIGH** - a once-at-open getBoundingClientRect strands the overlay the moment the page scrolls, and hand-rolled scroll listeners miss nested scrollers

`anchorPosition(anchor, floating, options?)` applies `position: fixed`, places the floating element, and keeps it placed: window `scroll` (capture, so nested scrollers reposition too) and `resize` re-run the math, and the dispose handle removes both listeners. It measures the anchor rect live per reposition and the floating box through `offsetWidth`/`offsetHeight` so CSS transforms never skew the math; `matchAnchorWidth: true` pins the width and takes the element out of flow BEFORE measuring, so the first positioning pass sees the final box; `onUpdate(placement)` reports each resolved placement after flipping. `computeAnchorPosition` is the pure rect-math seam - zero DOM, the testable core - for engines that own their own listener lifecycle (the factories' anchored layer). Computing once at open and walking away is the bug: every scroll strand the overlay.

**Incorrect (what is wrong):**

```ts
import { computeAnchorPosition } from "@hellajs/headless/utils";

// Computed once: the dropdown is misplaced on the first scroll. This is the
// pure seam, not the live wiring.
const place = (trigger: HTMLElement, dropdown: HTMLElement) => {
  const { x, y } = computeAnchorPosition(
    trigger.getBoundingClientRect(),
    { width: dropdown.offsetWidth, height: dropdown.offsetHeight },
    { width: window.innerWidth, height: window.innerHeight },
  );
  dropdown.style.position = "fixed";
  dropdown.style.left = `${x}px`;
  dropdown.style.top = `${y}px`;
};
```

**Correct (what is right):**

```ts
import { anchorPosition } from "@hellajs/headless/utils";

// Fixed placement plus window scroll (capture) and resize tracking,
// disposed when the surface closes.
const place = (trigger: HTMLElement, dropdown: HTMLElement) =>
  anchorPosition(trigger, dropdown, {
    placement: "bottom-start",
    matchAnchorWidth: true,
    onUpdate: (placement) => dropdown.setAttribute("data-side", placement),
  });
```

Reference: `packages/headless/lib/utils/anchorPosition.ts` and `packages/headless/docs/api/anchorposition.mdx`

### 3.2 Read placements as flip-then-clamp with direction-aware start and end

**Impact: MEDIUM** - assuming the flip changes axis, or that vertical-side start and end ignore direction, places overlays on the wrong edge for RTL users

Placement strings are a side plus optional alignment: `"bottom-start"`, `"left-end"`, plain `"bottom"` reads as center. When the floating box does not fit the viewport on the requested side, the placement flips to the opposite side on the SAME axis - vertical stays vertical, horizontal stays horizontal - and both axes then shift-clamp inside the viewport. `offset` (default 0) is the gap on the placement side. Direction resolves only the horizontal axis: `top`/`bottom` placements resolve `-start`/`-end` through `dir` (start trails left in ltr, right in rtl), while `left`/`right` placements align vertically and are direction-free. `anchorPosition` reads `dir` from the anchor's computed `direction` once at setup; `computeAnchorPosition` defaults to ltr and takes `dir` in its options.

**Incorrect (what is wrong):**

```ts
import { computeAnchorPosition } from "@hellajs/headless/utils";

// dir omitted: an RTL anchor's bottom-start menu aligns its start edge to
// the wrong side - the vertical axis is the one direction resolves.
const place = (anchorRect: DOMRect, dropdown: HTMLElement) =>
  computeAnchorPosition(
    anchorRect,
    { width: dropdown.offsetWidth, height: dropdown.offsetHeight },
    { width: window.innerWidth, height: window.innerHeight },
    { placement: "bottom-start", offset: 4 },
  );
```

**Correct (what is right):**

```ts
import { computeAnchorPosition } from "@hellajs/headless/utils";

// dir resolves -start/-end on the horizontal axis; the engine flips
// bottom to top only when the floating box will not fit below the anchor.
const place = (anchorRect: DOMRect, dropdown: HTMLElement, dir: "ltr" | "rtl") =>
  computeAnchorPosition(
    anchorRect,
    { width: dropdown.offsetWidth, height: dropdown.offsetHeight },
    { width: window.innerWidth, height: window.innerHeight },
    { placement: "bottom-start", offset: 4, dir },
  );
```

Reference: `packages/headless/lib/utils/computeAnchorPosition.ts` and `packages/headless/tests/computeanchorposition.test.ts`


## 4. Pointer gestures

### 4.1 Consumers own drag value math and touch-action

**Impact: HIGH** - without touch-action none the browser scrolls instead of dragging - pointercancel fires mid-gesture and the delta stream dies

`onDrag(el, handlers)` reports CUMULATIVE deltas - `{ dx, dy, event }` measured from the drag start - on primary-button pointerdown (presses on `[disabled]` descendants are skipped), takes guarded pointer capture, and fires `onEnd` once on pointerup, pointercancel, or lostpointercapture. The util owns only the tracking: clamping, translation, and any value derivation are the consumer's math over the cumulative deltas - never stack deltas per move. `touch-action: none` is the consumer's responsibility too: without it a touch drag scrolls the page and the browser cancels the pointer stream. Keep the wiring for the element's lifetime and dispose it on teardown, or use the factories that compose `onDrag` internally (slider, scrollArea, toast).

**Incorrect (what is wrong):**

```tsx
import { onDrag } from "@hellajs/headless/utils";

// No touch-action (touch drags scroll and cancel), and per-move deltas are
// stacked onto the transform: the sheet accelerates away from the pointer.
onDrag(sheet, {
  onMove: ({ dx }) => {
    sheet.style.transform += ` translateX(${dx}px)`;
  },
});
```

**Correct (what is right):**

```tsx
import { onDrag } from "@hellajs/headless/utils";

const wireDrawer = (drawer: HTMLElement, onClose: () => void) => {
  drawer.style.touchAction = "none"; // the drag's contract: consumer-owned
  let start = 0;
  return onDrag(drawer, {
    onStart: () => {
      start = Number(drawer.dataset.x ?? 0);
    },
    onMove: ({ dx }) => {
      const x = Math.max(0, start + dx); // cumulative dx plus consumer clamping
      drawer.dataset.x = String(x);
      drawer.style.transform = `translateX(${x}px)`;
    },
    onEnd: () => {
      if (Number(drawer.dataset.x ?? 0) > 120) onClose();
    },
  });
};
```

Reference: `packages/headless/lib/utils/onDrag.ts` and `packages/headless/tests/ondrag.test.ts`

### 4.2 Track two-pointer pinches with onPinch; press timers fire only when configured

**Impact: MEDIUM** - composing onDrag for pinch loses the second pointer to its single-pointer capture, and an un-opted single tap never fires

`onPinch(el, handlers)` owns its two-pointer map - the first two primary-button pointers join (a third is ignored), each captured - because `onDrag` is single-pointer and its capture model fights two-pointer tracking: never compose two drags into a pinch. The second pointer's landing starts the gesture with a baseline of the pair's distance and centroid; moves report `scale` (current over baseline distance) and centroid `dx`/`dy`; either tracked pointer ending fires `onEnd` once, and a fresh second pointer re-baselines. `onLongPress(el, handler, options?)` fires once when a press outlives `duration` (default 500); drift beyond `tolerance` px (default 8) - scrolling - clears it, and CSS `:active` keeps immediate press feedback. `onDoubleTap(el, { onDoubleTap })` pairs taps whose pointerups land within 8px, inside `interval` (default 250); `onSingleTap` is OPT-IN and fires with the first tap's event only after the interval expires - single-tap handling that must be immediate belongs elsewhere.

**Incorrect (what is wrong):**

```ts
import { onDrag } from "@hellajs/headless/utils";

// Two onDrag wirings fake a pinch: the first pointer's capture owns the
// element and the second gesture's move stream never arrives intact.
onDrag(canvas, { onMove: ({ dx }) => trackFirst(dx) });
onDrag(canvas, { onMove: ({ dy }) => trackSecond(dy) });
```

**Correct (what is right):**

```ts
import { onDoubleTap, onLongPress, onPinch } from "@hellajs/headless/utils";

const wireSurface = (surface: HTMLElement, picker: HTMLElement) => {
  surface.style.touchAction = "none"; // pinch and press consumers own it
  const disposePinch = onPinch(surface, {
    onMove: ({ scale, dx, dy }) => {
      surface.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    },
    onEnd: () => {
      surface.style.transform = "translate(0px, 0px) scale(1)";
    },
  });
  const disposePress = onLongPress(
    surface,
    (event) => {
      picker.style.left = `${event.clientX}px`;
      picker.style.top = `${event.clientY}px`;
      picker.hidden = false;
    },
    { duration: 400 },
  );
  const disposeDoubleTap = onDoubleTap(surface, {
    onDoubleTap: () => {
      surface.style.transform = "scale(2)";
    },
  });
  return () => {
    disposePinch();
    disposePress();
    disposeDoubleTap();
  };
};
```

Reference: `packages/headless/lib/utils/onPinch.ts` and `packages/headless/lib/utils/onLongPress.ts` and `packages/headless/lib/utils/onDoubleTap.ts`

### 4.3 Gate swipe actions on commit, not on move

**Impact: MEDIUM** - acting inside onMove fires the action dozens of times per gesture, and releases missing both the distance threshold and the velocity floor must cancel back

`onSwipe(el, handlers, options?)` composes `onDrag` (inheriting its primary-button and `[disabled]` guards and guarded capture) and samples moves into a rolling 100ms velocity window. On release, the dominant axis - the larger of `|dx|` and `|dy|`, its sign the direction - commits only when it traveled at least `threshold` px (default 50) OR its release velocity crossed the `velocity` floor in px/ms (default 0.5); every other release calls `onCancel`. Move-state changes (translation, opacity) belong in `onMove`; the action itself (dismiss, navigate) belongs in `onCommit` switched on `direction`, and visual restoration in `onCancel` - a fast short flick commits through velocity while well under the distance threshold, so partial drags must not act.

**Incorrect (what is wrong):**

```tsx
import { onSwipe } from "@hellajs/headless/utils";

// The action fires mid-gesture on every move past a rough threshold - a
// hesitant 41px drag dismisses a card the commit gate would have cancelled.
onSwipe(card, {
  onMove: ({ dx }) => {
    if (dx < -40) removeCard();
    card.style.transform = `translateX(${dx}px)`;
  },
});
```

**Correct (what is right):**

```tsx
import { onSwipe } from "@hellajs/headless/utils";

const wireCard = (card: HTMLElement, onRemove: () => void) =>
  onSwipe(
    card,
    {
      onMove: ({ dx }) => {
        card.style.transform = `translateX(${dx}px)`;
      },
      onCommit: ({ direction }) => {
        if (direction === "left") onRemove();
      },
      onCancel: () => {
        card.style.transform = "translateX(0)";
      },
    },
    { threshold: 80 },
  );
```

Reference: `packages/headless/lib/utils/onSwipe.ts` and `packages/headless/tests/onswipe.test.ts`


## 5. Layered dismissal and modality

### 5.1 Dispose the layer inside the layerDismissal handler

**Impact: CRITICAL** - dismissal does not pop the shared stack - a layer closed without disposing wedges every layer beneath it

`layerDismissal(nodes, onDismiss)` pushes onto a shared module-level stack; document capture-phase Escape and outside pointerdown fire `onDismiss` ONLY when this layer is top - stacked overlays (submenu over menu over popover) dismiss one at a time, outermost first. The dismissal itself does NOT pop the stack: `onDismiss` must close the surface AND call the dispose handle, which is what removes the entry. A handler that closes without disposing leaves a dead layer on top that silently absorbs every later Escape and outside press for the whole app. The same discipline applies to teardown paths that remove the node - dispose pops, so unmounting a layered surface must run the handle. `nodes` follows the same live-getter contract as `onOutside`.

**Incorrect (what is wrong):**

```ts
import { layerDismissal } from "@hellajs/headless/utils";

// Closes the panel but never disposes: the dead layer stays on top of the
// stack and swallows every future Escape and outside press.
const dismiss = layerDismissal(() => [panel()], () => {
  open.set(false);
});
```

**Correct (what is right):**

```ts
import { layerDismissal } from "@hellajs/headless/utils";

const armLayer = (panel: HTMLElement, close: () => void) => {
  const dispose = layerDismissal(() => [panel], () => {
    close();
    dispose(); // the handler must pop - dismissal does not
  });
  return dispose; // teardown paths dispose too: disposing pops the stack
};
```

Reference: `packages/headless/lib/utils/layerDismissal.ts` and `packages/headless/tests/layerdismissal.test.ts`

### 5.2 Arm modal panels with modal, not hand-rolled traps

**Impact: HIGH** - manually arming trapFocus, onEscape, and onOutside at mount leaves them armed after close and never re-arms on reopen

`modal(node, { state, onClose, escape, outside, onExited })` registers one re-arm effect over the `state` getter: while it reads `"open"`, `onEscape` and `onOutside` arm (both only when `onClose` exists - a missing `onClose` leaves both off, nothing throws) plus `trapFocus`; the flip to `"closed"` disarms them immediately; reopening re-arms; node removal drains everything. Node-scoped: no cleanup arrays, no dispose handle - the wiring is owned by the element's lifetime. `state` must be a live getter (`() => open() ? "open" : "closed"`), never a captured string. `onExited` rides node-lifetime `animationend` (unfiltered - bubbled child animations count) and the node's own transform `transitionend` (the drawer exit channel), gated on `state() === "closed"` and kept through the close flip so the exit animation finishes. Hand-rolling the three utils in a mount hook arms once, leaks on close, and re-arms on nothing.

**Incorrect (what is wrong):**

```tsx
import { onEscape, onOutside, trapFocus } from "@hellajs/headless/utils";

// Armed once at mount: the trap and dismissal stay live after close, and
// reopening the panel re-arms nothing.
const Panel = (props: { hook?: Record<string, unknown> }) => (
  <div
    role="dialog"
    hook:afterMount={(node) => {
      if (!(node instanceof HTMLElement)) return;
      trapFocus(node);
      onEscape(node, () => closePanel());
      onOutside(() => [node], () => closePanel());
    }}
  >
    Panel body
  </div>
);
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import { modal } from "@hellajs/headless/utils";

const open = signal(false);
const unmount = (): void => undefined;

const Sheet = () => (
  <div
    role="dialog"
    hook:afterMount={(node) => {
      if (!(node instanceof HTMLElement)) return;
      modal(node, {
        state: () => (open() ? "open" : "closed"), // live getter: re-arms per flip
        onClose: () => open(false),
        onExited: unmount, // exit animationend while closed
      });
    }}
  >
    Sheet body
  </div>
);
```

`dialog`'s `Content` arms this engine for you; reach for `modal` directly only on hand-built panels.

Reference: `packages/headless/lib/utils/modal.ts` and `packages/headless/docs/api/modal.mdx`


## 6. Component factories

### 6.1 Select calendar values in the mode's shape

**Impact: MEDIUM** - writing an array into a single-mode calendar or reading a range as a Date corrupts selection state and the range hover preview

`calendar(options)` owns its selection in the `mode`'s shape: `"single"` reads and reports a `Date`, `"multiple"` a `Date[]` (insertion order), `"range"` a `{ from, to }` span with hover preview, reorder, and reset - the `value` option is a static seed or a controlled accessor in exactly that shape, and `onValueChange` reports defensive copies the same way. A controlled `month` accessor snaps the visible month back on every change (winning over internal navigation) while `onMonthChange` still reports paging from the buttons and spill-causing keys; `disabled(date)` blocks selection and keyboard activation (outside days always disabled). The tree is `Root > Months > Month > Caption/Nav/Grid` with `Grid` rendering the whole `role="grid"` table and owning the keyboard model; `CalendarRows.DayButton` is the manual-composition day part with boolean-or-accessor state flags for driving a composed grid live.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";
import { calendar } from "@hellajs/headless";

const picked = signal<Date[]>([]);
const Booker = calendar({ mode: "single", value: () => picked() }); // mode
// mismatch: single reads a Date, the accessor hands it an array, and every
// selection lands through a cast or corrupts the range math.
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import { calendar, CalendarRows } from "@hellajs/headless";

const picked = signal(new Date());
const Booker = calendar({
  mode: "single",
  value: () => picked(),
  onValueChange: (value) => {
    if (value instanceof Date) picked(value); // the mode's shape
  },
  disabled: (date) => date.getDay() === 0, // Sundays
});

const CalendarHost = () => (
  <Booker.Root>
    <Booker.Months>
      <Booker.Month>
        <Booker.Caption>
          <Booker.CaptionLabel />
          <Booker.Nav>
            <Booker.PrevButton />
            <Booker.NextButton />
          </Booker.Nav>
        </Booker.Caption>
        <Booker.Grid />
      </Booker.Month>
    </Booker.Months>
  </Booker.Root>
);

const Today = (day: Date) => (
  <CalendarRows.DayButton day={day} today focused={false} disabled={false} />
);
```

Reference: `packages/headless/lib/calendar.tsx` and `packages/headless/tests/calendar.test.ts`

### 6.2 Keep tabs and accordion content mounted under data-state

**Impact: MEDIUM** - conditional unmount of disclosure bodies kills CSS collapse animations and re-mounts (and re-runs) the body content on every toggle

Disclosure bodies stay MOUNTED and animate through CSS keyed on `data-state` - `accordion` content holds under `data-state="closed"` while CSS collapses it (no exit machine), `tabs` panels stay in the DOM hidden while inactive, and `collapsible` follows the same shape over one controlled-or-internal open signal with a per-call generated id pair. Do not gate these bodies on the open value yourself: the collapse animation dies and the body's internal state (form inputs, scroll positions) resets per toggle. `accordion`'s `onValueChange` is mode-shaped - single mode reports the one open value or `""`, `multiple` the membership array - with `type: "single"` clamping multi-seeds to the first, `collapsible: true` gating the last close, and value-derived `hella-accordion-trigger-<value>`/`-content-<value>` id pairs. `tabs` arms focusin-select over its tablist (focusing a tab selects it), the tabindex walk landing on the selection; `active`/`onActivate`/`onToggle` overrides exist for manual composition.

**Incorrect (what is wrong):**

```tsx
import { accordion } from "@hellajs/headless";

const Faq = accordion({ type: "single", collapsible: true });
// Unmounting the closed body: the CSS collapse never runs and any state
// inside the body resets on every toggle.
const FaqHost = () => (
  <Faq.Root>
    <Faq.Item value="billing">
      <Faq.Trigger value="billing">Billing</Faq.Trigger>
      {open("billing") ? <Faq.Content value="billing">Charged monthly</Faq.Content> : null}
    </Faq.Item>
  </Faq.Root>
);
```

**Correct (what is right):**

```tsx
import { accordion, collapsible, tabs } from "@hellajs/headless";

const Faq = accordion({ type: "single", collapsible: true });
const Notes = collapsible();
const Pane = tabs();

const Dock = () => (
  <div>
    <Pane.List>
      <Pane.Trigger value="preview">Preview</Pane.Trigger>
      <Pane.Trigger value="code">Code</Pane.Trigger>
    </Pane.List>
    <Pane.Content value="preview">Preview panel</Pane.Content>
    <Pane.Content value="code">Code panel</Pane.Content>
    <Notes.Trigger>Notes</Notes.Trigger>
    <Notes.Content>Session notes</Notes.Content>
    <Faq.Root>
      <Faq.Item value="billing">
        <Faq.Trigger value="billing">Billing</Faq.Trigger>
        <Faq.Content value="billing">Charged monthly</Faq.Content>
      </Faq.Item>
    </Faq.Root>
  </div>
);
```

Reference: `packages/headless/lib/accordion.tsx` and `packages/headless/lib/tabs.tsx` and `packages/headless/tests/tabs.test.ts`

### 6.3 Let open surfaces exit through animationend under data-state

**Impact: HIGH** - unmounting portaled content on the open flip kills the exit animation mid-frame, and an exit with no animationend handler never unmounts past the fallback budget

Every overlay factory closes through a visible/exit machine: the flip to closed keeps the subtree MOUNTED under `data-state="closed"` while the exit CSS animates, and the unmount lands on the surface's own `animationend` (or a fallback budget, 250ms by default; `dialog`'s `fallbackMs` tunes it). Two consequences for consumers. First, key your exit CSS off `data-state="closed"` - that attribute, not a removal, is the exit trigger, and entry animationends are ignored (`onExited` reports only exits). Second, do not gate the members on the open signal yourself (`show() && <Content>`) - that unmounts the panel before the exit starts and skips the machine's mid-exit reopen semantics (a reopen during the exit clears the pending fallback and keeps the subtree). Portaled surfaces start closed - there is no open seed; drive the open state and let the members animate.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";
import { dialog } from "@hellajs/headless";

const open = signal(false);
const Sheet = dialog();

// Gating on the open signal unmounts Content the frame the state flips -
// the exit animation never runs, so data-state="closed" CSS is dead code.
const SheetHost = () => (
  <div>
    <Sheet.Trigger>Open sheet</Sheet.Trigger>
    {open() ? <Sheet.Content>Sheet body</Sheet.Content> : null}
  </div>
);
```

**Correct (what is right):**

```tsx
import { dialog } from "@hellajs/headless";

const Sheet = dialog({ fallbackMs: 300 }); // budget for exits whose animationend never fires

const SheetHost = () => (
  <div>
    <Sheet.Trigger>Open sheet</Sheet.Trigger>
    <Sheet.Content escape outside={false}>
      Sheet body
      <Sheet.Close>Done</Sheet.Close>
    </Sheet.Content>
  </div>
);
```

`portal: false` renders the bare inline panel for manual compositions - no gate, no portal, no overlay; the exit notification is then the caller's alone.

Reference: `packages/headless/lib/internal/exitMachine.ts` and `packages/headless/lib/dialog.tsx` and `packages/headless/tests/dialog.test.tsx`

### 6.4 Call factories in component scope and keep portaled Content under a mounted root

**Impact: CRITICAL** - calling a factory per render loses state on every evaluation, and a portal anchored outside every mounted root leaks its body content on unmount

Each factory call (`popover`, `dialog`, `menu`, ...) creates one closure owning the open state, the exit machine's effect, and generated ids - call it ONCE per surface instance, in component scope (module scope or a component body), never inside a per-render helper that re-runs per evaluation: the state resets and the effect leaks per call. Compose the returned TitleCase members as JSX; the stateless structural rows (`PopoverRows` and friends) are static module-level parts needing no factory. `Content` portals to `document.body` - and the portal anchor must stay a DESCENDANT of a mounted root: `mount`'s root set is captured at attach, so a portal whose anchor sits beside (not under) a mounted root is never cleaned and the body content leaks on unmount. Render `Content` inside the same mounted tree as its `Trigger`. The trigger should not anchor positioning? Add `Anchor`.

**Incorrect (what is wrong):**

```tsx
import { popover } from "@hellajs/headless";

// Factory re-created every evaluation: open state resets on each render and
// every call registers a fresh exit-machine effect.
const SettingsRow = () => {
  const Settings = popover();
  return (
    <div>
      <Settings.Trigger>Settings</Settings.Trigger>
      <Settings.Content side="bottom">Preferences</Settings.Content>
    </div>
  );
};
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import { popover, PopoverRows } from "@hellajs/headless";

const open = signal(false);
const Settings = popover({
  open: () => open(),
  onOpenChange: (next) => open(next),
});

const SettingsCard = () => (
  <div>
    <Settings.Trigger>Settings</Settings.Trigger>
    <Settings.Content side="bottom" align="start" sideOffset={4}>
      <PopoverRows.Header>
        <PopoverRows.Title>Display</PopoverRows.Title>
        <PopoverRows.Description>Appearance and density</PopoverRows.Description>
      </PopoverRows.Header>
    </Settings.Content>
  </div>
);
```

Reference: `packages/headless/lib/popover.tsx` and `packages/headless/tests/popover.test.ts`

### 6.5 Drive forms through the createForm controller signals

**Impact: HIGH** - writing field state into local copies desyncs dirty and validation, and the Form parts read the controller through explicit props - no context provider exists to substitute

`createForm(initial, options?)` builds one writable signal per field - the KEY SET IS FIXED at creation from `initial`'s keys; a later field is absent until you create a form with it - plus the `errors`/`touched`/`dirty` signals and the submit path. Validators run on blur, on `setField` once the field is touched, and on submit; `validate()` aggregates every field; `reset()` restores values and clears state; `handleSubmit(onValid)` returns the submit handler that preventDefaults the optional event, marks all touched, and calls `onValid(values)` only when clean. The five `Form` parts read the controller through EXPLICIT props (there is no context): thread `error`/`invalid` accessors from `form.errors()` and the message list into `FormMessage` - derive every flag from the controller's signals so validation, dirty tracking, and the message gate stay in one place. Field flags take plain booleans or reactive accessors; use accessors.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";
import { createForm, FormItem, FormLabel } from "@hellajs/headless";

const form = createForm({ email: "" });
const emailError = signal(""); // a parallel error signal: blur validation,
// submit-time revalidation, and reset never reach it.
const Field = () => (
  <FormItem error={() => emailError() !== ""}>
    <FormLabel for="email" error={() => emailError() !== ""}>Email</FormLabel>
  </FormItem>
);
```

**Correct (what is right):**

```tsx
import { createForm, FormControl, FormDescription, FormItem, FormLabel, FormMessage } from "@hellajs/headless";

const save = (values: { email: string }): void => undefined;
const form = createForm(
  { email: "" },
  {
    validators: {
      email: (value) => (value.includes("@") ? null : "Enter a valid email"),
    },
  },
);

const EmailField = () => (
  <FormItem error={() => form.errors().email != null}>
    <FormLabel for="email" error={() => form.errors().email != null}>
      Email
    </FormLabel>
    <FormControl invalid={() => form.errors().email != null} describedBy="email-hint">
      <input id="email" value={() => form.values.email()} />
      <FormDescription id="email-hint">We only use this to reply</FormDescription>
    </FormControl>
    <FormMessage errors={() => (form.errors().email ? [form.errors().email!] : [])} />
  </FormItem>
);

const submit = form.handleSubmit((values) => save(values));
```

Reference: `packages/headless/lib/form.tsx` and `packages/headless/tests/form.test.ts`

### 6.6 Let inputOtp own the caret and read the code through its value

**Impact: MEDIUM** - wiring per-slot inputs loses native selection, autofill, and paste, and re-implementing the caret remap fights the transparent control input

`inputOtp(options)` renders ONE transparent control input overlaying the display slots and holding the whole code - native selection, caret, and autofill survive because there is exactly one real input - while `Root` remaps collapsed carets onto one-slot selections (typing advances, backspace clears and retreats), mirrors each slot's character, ring, and caret through afterMount effects over the `data-index`-keyed slots, merges paste at the selection under the `maxLength` clamp and `pattern` mask, and reports `onValueChange` per accepted change plus `onComplete` ONCE per transition to a full code. The display parts (`Group`, `Slot`, `Separator`) are the static `OtpRows`; slots take `caretWrapClass`/`caretClass` hooks for styling the mirrored caret. `maxLength` is fixed after mount and `value` is a static seed or a controlled accessor - read the code through `onValueChange`/`onComplete`, not by querying the slots.

**Incorrect (what is wrong):**

```tsx
import { inputOtp } from "@hellajs/headless";

const Code = inputOtp({ maxLength: 6 });
// Reading slot textContent per keystroke: the mirrored characters are an
// afterMount effect's output, and autofill and paste land in the hidden
// control input, not in any slot.
const readCode = () =>
  Array.from(document.querySelectorAll("[data-slot='input-otp-slot']"))
    .map((slot) => slot.textContent ?? "")
    .join("");
```

**Correct (what is right):**

```tsx
import { inputOtp, OtpRows } from "@hellajs/headless";

const verify = (code: string): void => undefined;
const updateProgress = (filled: number): void => undefined;
const Code = inputOtp({
  maxLength: 6,
  pattern: "\\d",
  onValueChange: (value) => updateProgress(value.length),
  onComplete: (value) => verify(value), // once per transition to a full code
});

const OtpField = () => (
  <Code.Root>
    <OtpRows.Group>
      <OtpRows.Slot index={0} />
      <OtpRows.Slot index={1} />
      <OtpRows.Slot index={2} />
      <OtpRows.Separator />
      <OtpRows.Slot index={3} />
      <OtpRows.Slot index={4} />
      <OtpRows.Slot index={5} />
    </OtpRows.Group>
  </Code.Root>
);
```

Reference: `packages/headless/lib/inputOtp.tsx` and `packages/headless/tests/input-otp.test.ts`

### 6.7 Key listbox options by value through the factory members

**Impact: HIGH** - rows keyed by label or index break aria-activedescendant, typeahead, and reorder reuse - and options rendered outside the factory's parts never register

`combobox`, `select`, and `command` share one listbox model whose option identity is the VALUE: stable ids derive as `<listId>-opt-<value>`, so `aria-activedescendant`, typeahead, and `keyBy="value"` DOM reuse survive key-ordered list changes. Two registration shapes: data-driven (pass `items` to `combobox`/`command` - the entries array or a reactive accessor; `List` renders the body, non-matches stay mounted hidden) and DOM-order (omit `items`, render `Item` children inside the list - options register from the rendered children, so rows rendered outside the factory's parts or keyed by anything but `value` never join roving, selection, or Enter commits). `select` is DOM-order only; its options scan live from the DOM so dynamic children join per keypress, focus lands on the selected option at open, and focus returns to the trigger on close. `command`'s cursor lands on the first ranked entry and re-lands on list mount and query input.

**Incorrect (what is wrong):**

```tsx
import { combobox } from "@hellajs/headless";

const Fruit = combobox();
// Custom rows instead of List/Item: no registration, so roving skips them,
// Enter commits nothing, and the label-keyed identity breaks typeahead.
const FruitHost = () => (
  <div>
    <Fruit.Input />
    <Fruit.Content>
      <div role="listbox">
        {fruits().map((fruit) => (
          <div key={fruit.label} role="option">
            {fruit.label}
          </div>
        ))}
      </div>
    </Fruit.Content>
  </div>
);
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import { command, combobox, select } from "@hellajs/headless";

const picked = signal("");
const fruits = [
  { value: "apple", label: "Apple" },
  { value: "banana", label: "Banana" },
];

const FruitCombo = combobox({
  items: () => fruits, // data-driven: value-keyed ids, hidden non-matches
  value: () => picked(),
  onValueChange: (next) => picked(typeof next === "string" ? next : ""),
});
const FruitSelect = select({ value: () => picked(), onValueChange: (next) => picked(next) });
const Actions = command({
  items: () => [
    { value: "save", label: "Save", group: "File", onSelect: () => undefined },
    { value: "close", label: "Close", group: "File", onSelect: () => undefined },
  ],
});

const PickerHost = () => (
  <div>
    <FruitCombo.Input />
    <FruitCombo.Content>
      <FruitCombo.List items={() => fruits} keyBy="value" />
    </FruitCombo.Content>
    <FruitSelect.Trigger>
      <FruitSelect.Value placeholder="Pick a fruit" />
    </FruitSelect.Trigger>
    <FruitSelect.Content>
      <FruitSelect.Item value="apple">Apple</FruitSelect.Item>
    </FruitSelect.Content>
    <Actions.Input />
    <Actions.List />
  </div>
);
```

Under `multiple`, combobox selections are arrays, the panel stays open on commit, and the input surface renders chips.

Reference: `packages/headless/lib/internal/listbox.ts` and `packages/headless/lib/combobox.tsx` and `packages/headless/tests/combobox.test.ts`

### 6.8 Compose menus from MenuRows, menuSub, and menubar

**Impact: HIGH** - hand-rolled menu rows lose selection dispatch and close-on-select, plain menu factories as submenus break stacking, and uncoordinated bar menus stay open side by side

`menu()` returns `{ Trigger, Content }`; the row parts are the static `MenuRows` (`Item`, `CheckboxItem`, `RadioGroup`, `RadioItem`, `Label`, `Separator`, `Group`, `Shortcut`) - selection dispatches through a document-level event that `Content` listens for, so rendering your own rows instead of `MenuRows` members breaks selection, typeahead focus, and close-on-select (`closeOnSelect: false` keeps the menu open on that row; `CheckboxItem` toggling closes unless told otherwise). Nested submenus come from `menuSub()` - hover-intent trigger (`pointerOnly`, ~100ms open / 300ms close), ArrowLeft exit, content enter cancelling a pending close - not from nesting a second `menu()`, which double-stacks layers and dismissal. `menubar()` returns `{ Bar, menu }`: each bar menu announces its open state, the bar closes siblings and mirrors the open id (`value`/`onValueChange`), and horizontal arrows hand off open-then-move between triggers. `trigger: "contextmenu"` swaps the button for a zone opening the menu at the pointer through a virtual anchor.

**Incorrect (what is wrong):**

```tsx
import { menu } from "@hellajs/headless";

const File = menu();
const Edit = menu(); // a nested "submenu" as a second top-level menu: two
// independent layers - Escape dismisses both at once, hover intent and
// ArrowLeft exit are absent, and selection in the child closes nothing.
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import { menu, MenuRows, menuSub } from "@hellajs/headless";

const autoSave = signal(true);
const theme = signal("dark");
const File = menu();
const Recent = menuSub();

const MenuHost = () => (
  <div>
    <File.Trigger>File</File.Trigger>
    <File.Content side="bottom" align="start">
      <MenuRows.Item shortcut="Ctrl+S">Save</MenuRows.Item>
      <MenuRows.CheckboxItem checked={() => autoSave()} onCheckedChange={(next) => autoSave(next)}>
        Autosave
      </MenuRows.CheckboxItem>
      <MenuRows.RadioGroup
        items={[
          { value: "light", label: "Light" },
          { value: "dark", label: "Dark" },
        ]}
        value={() => theme()}
        onValueChange={(next) => theme(next)}
      />
      <MenuRows.Separator />
      <Recent.Trigger inset>Open Recent</Recent.Trigger>
      <Recent.Content side="right" sideOffset={0}>
        <MenuRows.Item closeOnSelect={false}>Keep this menu open</MenuRows.Item>
      </Recent.Content>
    </File.Content>
  </div>
);
```

Reference: `packages/headless/lib/menu.tsx` and `packages/headless/tests/menu.test.ts` and `packages/headless/tests/menubar.test.ts`

### 6.9 Coordinate navigation menu panels through the root announcements

**Impact: MEDIUM** - panels portaled outside the shared viewport slot lose their measured sizing, and hand-managed open state breaks the one-open and indicator contracts

`navigationMenu()` centers on a controlled-or-internal open-VALUE store: `Trigger` announces its `value` on click and non-touch pointer-enter (one panel open at a time, a second click closes), the root mirrors announcements into the store, closes on outside pointerdown, and keeps a 100ms close grace that panel enter cancels - so panel open state is never yours to manage per panel. `Content` portals into the shared viewport slot (the root appends one as its last child unless `viewport: false`; a `viewport` selector prop retargets it), publishes its measured size to the slot through the `--radix-navigation-menu-viewport-width/height` vars, and exits under `data-state="closed"` through `animationend` or the 250ms fallback. The structural rows (`List`, `Item`, `Link`, `Indicator`) are the static `NavRows`; `Indicator` tracks the announced active trigger with measured geometry and re-measures on resize. Announcements scope to the bar containing the trigger - two bars stay independent.

**Incorrect (what is wrong):**

```tsx
import { navigationMenu, NavRows } from "@hellajs/headless";

const Docs = navigationMenu();
// Manual per-item open state plus no viewport: panels portal into
// document.body, publish their measured size nowhere, and the indicator
// loses its anchor.
const DocsBar = () => (
  <Docs.Root viewport={false}>
    <NavRows.List>
      <NavRows.Item>
        <Docs.Trigger value="guides" active={() => manuallyOpen("guides")}>
          Guides
        </Docs.Trigger>
        <Docs.Content value="guides">Guide pages</Docs.Content>
      </NavRows.Item>
    </NavRows.List>
  </Docs.Root>
);
```

**Correct (what is right):**

```tsx
import { navigationMenu, NavRows } from "@hellajs/headless";

const Docs = navigationMenu(); // root appends the shared viewport slot

const DocsBar = () => (
  <Docs.Root>
    <NavRows.List>
      <NavRows.Item>
        <Docs.Trigger value="guides">Guides</Docs.Trigger>
        <Docs.Content value="guides">
          <NavRows.Link active>Getting started</NavRows.Link>
        </Docs.Content>
      </NavRows.Item>
      <NavRows.Item>
        <Docs.Trigger value="api">API</Docs.Trigger>
        <Docs.Content value="api">Reference pages</Docs.Content>
      </NavRows.Item>
    </NavRows.List>
    <NavRows.Indicator />
  </Docs.Root>
);
```

Reference: `packages/headless/lib/navigationMenu.tsx` and `packages/headless/tests/navigation-menu.test.ts`

### 6.10 Use the press factories for toggles, checkboxes, and groups

**Impact: HIGH** - hand-rolled pressed-state buttons drift from the aria contracts, and the groups' exclusion semantics (single "" deselect, radio never-unset) are easy to get half right

The press family ships the complete interaction set: `toggle` (pressed-state button, `aria-pressed`/`data-state` on-off), `checkbox` (tri-state `role="checkbox"` - the `indeterminate` flag wins over `checked` for rendering and clears on an uncontrolled toggle; `Indicator` gates the check icon), `toggleSwitch` (`role="switch"` button plus its thumb-tracking `Indicator`), `toggleGroup` (single-mode exclusion where activating the active value deselects and reports `""`; `multiple` membership arrays in insertion order; `defaultValue`/`defaultValues` seeds), and `radioGroup` (exclusive never-unset selection - arrows move AND select through the focusin wiring, the tabindex walk lands on the selection, `orientation` scopes the axis, `name` threads onto every item). Each `Root` chains user clicks, gates on disabled, and arms/drains its group wiring; `Item`s default pressed/checked and the click action from the closure with `pressed`/`checked`/`onSelect` overrides for manual composition.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";

const on = signal(false);
// A hand-rolled toggle: no aria-pressed, no data-state, no disabled gating -
// each bespoke button re-derives the contract and drifts.
const BoldButton = () => (
  <button on:click={() => on(!on())}>{on() ? "Bold" : "Bold (off)"}</button>
);
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import { checkbox, radioGroup, toggle, toggleGroup, toggleSwitch } from "@hellajs/headless";

const bold = signal(false);
const align = signal("left");
const checkedCount = signal(0);

const Bold = toggle({ pressed: () => bold(), onPressedChange: (next) => bold(next) });
const Dark = toggleSwitch();
const Terms = checkbox({ indeterminate: () => checkedCount() > 0 && checkedCount() < 3 });
const Align = toggleGroup({
  value: () => align(),
  onValueChange: (next) => {
    if (typeof next === "string") align(next); // single mode reports "" on deselect
  },
});
const Size = radioGroup({ name: "size", orientation: "vertical" });

const Toolbar = () => (
  <div>
    <Bold.Root>Bold</Bold.Root>
    <Dark.Root>
      <Dark.Indicator />
    </Dark.Root>
    <Terms.Root>
      <Terms.Indicator />
    </Terms.Root>
    <Align.Root>
      <Align.Item value="left">Left</Align.Item>
      <Align.Item value="center">Center</Align.Item>
    </Align.Root>
    <Size.Root>
      <Size.Item value="sm">
        <Size.Indicator />
      </Size.Item>
    </Size.Root>
  </div>
);
```

Reference: `packages/headless/lib/press.tsx` and `packages/headless/lib/internal/press.ts` and `packages/headless/tests/press.test.ts`

### 6.11 Compose scrollArea and messageScroller through their members

**Impact: MEDIUM** - hand-computed scrollbar geometry drifts from the measured viewport, and chat scroll position needs the at-bottom stickiness contract, not a scroll listener

`scrollArea(options)` holds no reactive state: each `Scrollbar` owns its axis per instance - it measures the paired viewport (found via the closest root) on scroll and content growth, sizes the thumb by ratio with a 20px clamp, positions it by travel fraction, and arms the `onDrag` thumb mapping; geometry styles are wiring-owned, so compose `Root > Viewport + Scrollbar > Thumb` and style the parts, never the inline geometry. Both orientations compose into one root; the factory `observe` option forwards to every bar with a per-bar prop override. `messageScroller(options)` owns the at-bottom state (controlled `Signal<boolean>` or internal seed `true`) with the `ScrollerRows.Item` rows: `Viewport` flips at-bottom from scroll distance under a `threshold` (default 80), STICKS to the bottom on content growth while at-bottom, and leaves the position alone off the bottom; `Button` derives `data-active` and jumps after chaining a user click. Pass your own at-bottom signal when the rest of the app reads it.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";
import { scrollArea } from "@hellajs/headless";

const Log = scrollArea();
const progress = signal(0);
// Reading scrollTop in your own scroll listener and styling the thumb by
// hand: the bar's own measure math (ratio sizing, 20px clamp, drag travel)
// already owns exactly this - two writers disagree.
const LogPanel = () => (
  <Log.Root>
    <Log.Viewport on:scroll={() => progress(1)}>Log lines</Log.Viewport>
  </Log.Root>
);
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import { messageScroller, scrollArea, ScrollerRows } from "@hellajs/headless";

const atBottom = signal(true);
const Log = scrollArea();
const Feed = messageScroller({ atBottom, threshold: 60 });

const LogPanel = () => (
  <Log.Root>
    <Log.Viewport>Log lines</Log.Viewport>
    <Log.Scrollbar orientation="vertical">
      <Log.Thumb />
    </Log.Scrollbar>
  </Log.Root>
);

const ChatPanel = () => (
  <Feed.Provider>
    <Feed.Root>
      <Feed.Viewport>
        <Feed.Content>
          <ScrollerRows.Item>First message</ScrollerRows.Item>
        </Feed.Content>
      </Feed.Viewport>
      <Feed.Button />
    </Feed.Root>
  </Feed.Provider>
);
```

Reference: `packages/headless/lib/scrollArea.tsx` and `packages/headless/lib/messageScroller.tsx` and `packages/headless/tests/message-scroller.test.ts`

### 6.12 Drive slider values as thumb arrays and commit on release

**Impact: MEDIUM** - writing a scalar into the array-shaped value breaks thumb geometry, and treating every onValueChange as final turns drags into commit storms

`slider(options)` owns its value as a NUMBER ARRAY - the thumb count is the rendered `Thumb` set, keyed by `index`; a missing `value` seeds the `[min, max]` pair and a static array seeds the internal signal, while an accessor makes the slider controlled (writes report through `onValueChange` only). Pointer drags pick the nearest thumb and map track position through quantize/clamp with `step` decimals setting the rounding precision and `minStepsBetweenThumbs` enforcing the gap; `onValueChange` fires per accepted move (drag and keyboard alike) and `onValueCommit` fires when an interaction ENDS - drag release and each accepted key step. Mirror live drags through `onValueChange` and persist through `onValueCommit`, not the reverse. `Track`/`Range`/`Thumb` position styles are factory-owned; `orientation: "vertical"` maps from the bottom edge.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";
import { slider } from "@hellajs/headless";

const price = signal(0); // scalar: the value contract is number[] - one
// thumb renders with NaN geometry and the second thumb has no value at all
const Price = slider({ min: 0, max: 500, onValueChange: (next) => price(next[0] ?? 0) });
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import { slider } from "@hellajs/headless";

const price = signal([0, 100]);
const savePrice = (next: number[]): void => undefined;
const Price = slider({
  min: 0,
  max: 500,
  step: 10,
  minStepsBetweenThumbs: 2,
  value: () => price(), // accessor: controlled - reports only
  onValueChange: (next) => price(next), // live drag mirror
  onValueCommit: (next) => savePrice(next), // release and key steps
});

const PriceFilter = () => (
  <Price.Root>
    <Price.Track>
      <Price.Range />
    </Price.Track>
    <Price.Thumb index={0} />
    <Price.Thumb index={1} />
  </Price.Root>
);
```

Reference: `packages/headless/lib/slider.tsx` and `packages/headless/tests/slider.test.ts`

### 6.13 Mount one Toaster and drive toasts through the module API

**Impact: HIGH** - two Toasters render every card twice, and per-app toast state held outside the module can never reach the stack

The toast system is a module-level singleton: one global queue signal (three-visible cap retiring oldest first, hover-paused countdowns, swipe dismissal past 45% of the card width) driven by the `toast` callable, `toast.promise` (sticky loading card that swaps to the success or error flavor on settle), and `toast.dismiss(id?)`. `Toaster` is the portaled render of that queue - mount it ONCE per app; every additional mount renders the same records again. Do not hold toast state in your own signals or try to render cards yourself: enqueue through the API and let the stack own dismissal, timers, and the exit splice (`data-removed` holds a card for its 200ms exit). `ToastItem` is the util-bearing card (data attributes, hover pause, swipe); pass it as `Toaster`'s children render function to restyle while keeping the wiring.

**Incorrect (what is wrong):**

```tsx
import { toast, Toaster } from "@hellajs/headless";

// Two mounted Toasters: the shared queue renders in both stacks - every
// toast appears twice and dismissing one leaves its twin.
const App = () => (
  <div>
    <Sidebar>
      <Toaster position="bottom-left" />
    </Sidebar>
    <Main>
      <Toaster position="bottom-right" />
    </Main>
  </div>
);
```

**Correct (what is right):**

```tsx
import { toast, ToastItem, Toaster } from "@hellajs/headless";

const persist = (): Promise<void> => Promise.resolve();
const saveSettings = (): void => {
  toast.promise(persist(), {
    loading: "Saving...",
    success: "Settings saved",
    error: "Save failed",
  });
};
const dismissAll = (): void => toast.dismiss();

const App = () => (
  <div>
    <button on:click={saveSettings}>Save</button>
    <button on:click={dismissAll}>Dismiss all</button>
    <Toaster position="bottom-right">
      {(record) => <ToastItem record={record} richColors />}
    </Toaster>
  </div>
);
```

`duration: Infinity` sticks a toast; `resetHeadless()` empties the queue for tests.

Reference: `packages/headless/lib/toast.tsx` and `packages/headless/tests/toast.test.tsx`

### 6.14 Use tooltip and hoverCard for hover surfaces with their timing defaults

**Impact: MEDIUM** - skipping the Provider group or fighting the shared skip-delay clock with ad-hoc timers delivers tooltips that lag or flicker

`tooltip(options)` returns `{ Provider, Trigger, Content }`: the trigger arms `hoverIntent` for its lifetime (open `delay` default 700, `closeDelay` default 0 - the content hides the moment the pointer leaves) and carries `aria-describedby` to the generated content id; `Content` anchors and dismisses like the other overlays. Skip-delay sharing is `hoverIntent`'s module clock, not provider state - `Provider` is the passthrough grouping div tooltip-group styles target. `hoverCard(options)` returns `{ Trigger, Content }` (200/300 defaults) with the crossing contract: moving into the content holds it open, returning to the trigger cancels the pending close, leaving both regions closes after the delay - do not re-implement pointer ownership flags around it. Content re-arms a zero-delay hover through the engine so the keep-open wiring shares the armed lifecycle.

**Incorrect (what is wrong):**

```tsx
import { tooltip } from "@hellajs/headless";

const Tip = tooltip();
// Per-trigger delay of 700ms for every tooltip: adjacent triggers re-pay the
// full delay because this composition fights the shared skip-delay clock
// with a per-instance one, and closeDelay is left at hoverIntent's 300ms
// default instead of the tooltip contract's 0.
const Host = () => (
  <div>
    <Tip.Trigger>Save</Tip.Trigger>
    <Tip.Content side="top">Writes changes to disk</Tip.Content>
  </div>
);
```

**Correct (what is right):**

```tsx
import { hoverCard, tooltip } from "@hellajs/headless";

const Tip = tooltip({ delay: 300, closeDelay: 0 });
const Card = hoverCard(); // 200 open / 300 close, crossing contract included

const HoverHost = () => (
  <div>
    <Tip.Provider>
      <Tip.Trigger>Save</Tip.Trigger>
      <Tip.Content side="top">Writes changes to disk</Tip.Content>
    </Tip.Provider>
    <Card.Trigger>hellajs</Card.Trigger>
    <Card.Content side="bottom" sideOffset={4}>
      The surgical DOM library
    </Card.Content>
  </div>
);
```

Reference: `packages/headless/lib/tooltip.tsx` and `packages/headless/tests/tooltip.test.ts` and `packages/headless/tests/hover-card.test.ts`


## 7. State ownership

### 7.1 A controlled accessor reports; it never flips internal state

**Impact: CRITICAL** - passing a getter and expecting the factory to write it leaves a dead trigger - onOpenChange reports the request and nothing else moves

Every stateful factory resolves its state one way: pass an ACCESSOR (`open?: () => boolean`, `value?: () => string`, `checked?: boolean | (() => boolean)`, ...) and the factory is controlled - it never writes any internal state; the trigger, dismissal, and selection paths call `onOpenChange`/`onValueChange`/`onCheckedChange` with the requested value and YOU write your signal in that callback. Omit the accessor (or pass a plain boolean/array where the option accepts a seed) and state is internal - the factory flips it itself. Two consequences agents get wrong: a controlled accessor's external write notifies no one (`onOpenChange` reports factory-driven flips only - a controller-driven flip is your own change), and passing a getter while never writing in the callback makes the surface visibly dead (the trigger reports and nothing opens). The seed options (`defaultValue`, `defaultOpen`, `defaultValues`) are for uncontrolled mode only.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";
import { popover } from "@hellajs/headless";

const open = signal(false);
// Controlled accessor but no write in the callback: the trigger toggles
// nothing - open stays false forever and the popover is dead.
const Popover = popover({ open: () => open() });
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import { popover, toggleGroup } from "@hellajs/headless";

const open = signal(false);
const Popover = popover({
  open: () => open(),
  onOpenChange: (next) => open(next), // the controller writes its signal
});

const size = signal("m");
const Size = toggleGroup({
  value: () => size(),
  onValueChange: (next) => {
    if (typeof next === "string") size(next); // "" reports a single-mode deselect
  },
});
```

Reference: `packages/headless/lib/internal/press.ts` and `packages/headless/lib/popover.tsx` and `packages/headless/tests/popover.test.ts`

### 7.2 Keep state in your signals; factories return parts

**Impact: MEDIUM** - mirroring factory state into parallel signals desyncs the UI, and element-lifecycle state like avatar loading is never controllable at all

State stays in the caller's signals: a factory call returns part components plus a few read-only getters (`isOpen` on the disclosure factories, `matches`/`open`/`setOpen` on combobox) - it does not expose a state object to write. Derive the rest of your UI from the same signals you pass (or from the getters), never from a parallel signal updated by watching the DOM - the derived surface desyncs the moment a factory-driven path (dismissal, keyboard, exit machine) flips without your listener seeing it. Two deliberate exceptions to controllability: `avatar`'s loaded state is element-lifecycle fact (the native `load`/`error` events flip it; there is no `loaded` option, each call independent), and the toast queue is module-global by design. `resetHeadless()` clears the shared hover-intent clock, the dismissal layer stack, and the toast queue - a test-isolation hook, not a production reset.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";
import { avatar } from "@hellajs/headless";

const loaded = signal(false); // avatar owns this state: it lives in the
// factory's closure and flips on the img's native load/error events - a
// parallel signal never hears about either.
const Avatar = avatar();
const Profile = () => (
  <Avatar.Root>
    <Avatar.Image src="/me.png" />
    <Avatar.Fallback style={() => (loaded() ? "display: none" : "")}>MH</Avatar.Fallback>
  </Avatar.Root>
);
```

**Correct (what is right):**

```tsx
import { combobox } from "@hellajs/headless";

const countries = [
  { value: "se", label: "Sweden" },
  { value: "no", label: "Norway" },
];
const Country = combobox({ items: () => countries });

// Derive from the factory's getters, not from DOM watchers: matches() is
// the live filtered list, open()/setOpen the open-state surface. The
// fallback swap in avatar needs nothing here - it is attribute-driven.
const resultCount = (): number => Country.matches().length;
const panelLabel = (): string => (Country.open() ? `${resultCount()} matches` : "Closed");
```

Reference: `packages/headless/lib/avatar.tsx` and `packages/headless/lib/internal/reset.ts` and `packages/headless/docs/concepts/headless-components.mdx`


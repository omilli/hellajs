---
name: headless-best-practices
description: >
  Best practices for @hellajs/headless utilities and component factories: trapFocus, onEscape, onOutside, rovingTabIndex, anchorPosition, hoverIntent, menuTypeahead, onDrag, onSwipe, onPinch, layerDismissal, modal, popover, dialog, menu, tooltip, hoverCard, combobox, select, command, toggle, tabs, accordion, navigationMenu, slider, toast, calendar, inputOtp, createForm, scrollArea, messageScroller. Use when writing or reviewing code importing @hellajs/headless or @hellajs/headless/utils: wiring focus traps, dismissal layers, anchor positioning, or pointer gestures, or composing the part sets into overlays, menus, listboxes, tabs, toasts, calendars, and forms. Covers: discarded dispose handles leak document listeners, snapshot arrays where getters are required dismiss portal content, controlled accessors never flip so triggers go dead. Use ONLY for headless behaviors - DOM rendering belongs to dom-best-practices, reactive primitives to core-best-practices, styled registry components to ui-best-practices.
---

# headless-best-practices

Grounded rules for `@hellajs/headless`: fifteen renderer-free wiring utils (dispose-handle ownership over real DOM nodes - focus traps, dismissal, positioning, hover timing, gestures) plus the component factories whose closures own controlled-or-internal state and return TitleCase part sets that render structure, never styles. State stays in the caller's signals. Every rule is derived from the package source and its test suite; each rule file cites the symbols and tests that pin it.

## When to Apply

- Any code importing `@hellajs/headless` or `@hellajs/headless/utils`.
- Wiring focus traps, Escape/outside dismissal, layered dismissal, anchor positioning, hover intent, typeahead, or pointer gestures (drag, swipe, pinch, long-press, double-tap) on real DOM nodes.
- Composing the headless part sets: overlays, menus, listboxes, press controls, tabs and disclosure, toasts, calendars, OTP inputs, forms, scroll surfaces.

Not for: DOM rendering and mounting (`dom-best-practices`), reactive primitives (`core-best-practices`), styled copy/paste components (`ui-best-practices`).

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
| util | Utils entry and dispose handles | HIGH |
| int | Interaction primitives | CRITICAL |
| pos | Anchor positioning | HIGH |
| gest | Pointer gestures | HIGH |
| layer | Layered dismissal and modality | CRITICAL |
| comp | Component factories | CRITICAL |
| state | State ownership | CRITICAL |

## Rules

### Utils entry and dispose handles (util)

- `util-utils-subpath` - Import utils from the headless/utils subpath
- `util-dispose-handles` - Call every util's dispose handle on teardown

### Interaction primitives (int)

- `int-outside-getters` - Pass live getters where onOutside and layerDismissal expect them
- `int-trap-focus` - Release trapFocus and let it own Tab wrapping
- `int-roving-tabindex` - Give rovingTabIndex a selector for non-natively-focusable items
- `int-hover-typeahead` - Match hoverIntent pointerOnly and menuTypeahead getters to the surface

### Anchor positioning (pos)

- `pos-anchor-live-overlay` - Use anchorPosition for live fixed overlays
- `pos-placement-resolution` - Read placements as flip-then-clamp with direction-aware start and end

### Pointer gestures (gest)

- `gest-drag-cumulative` - Consumers own drag value math and touch-action
- `gest-swipe-commit` - Gate swipe actions on commit, not on move
- `gest-pinch-and-press` - Track two-pointer pinches with onPinch; press timers fire only when configured

### Layered dismissal and modality (layer)

- `layer-dismissal-stack` - Dispose the layer inside the layerDismissal handler
- `layer-modal-arming` - Arm modal panels with modal, not hand-rolled traps

### Component factories (comp)

- `comp-factory-scope-portal` - Call factories in component scope and keep portaled Content under a mounted root
- `comp-exit-machine` - Let open surfaces exit through animationend under data-state
- `comp-menu-family` - Compose menus from MenuRows, menuSub, and menubar
- `comp-tooltip-hover` - Use tooltip and hoverCard for hover surfaces with their timing defaults
- `comp-listbox-family` - Key listbox options by value through the factory members
- `comp-press-family` - Use the press factories for toggles, checkboxes, and groups
- `comp-disclosure-family` - Keep tabs and accordion content mounted under data-state
- `comp-toast-singleton` - Mount one Toaster and drive toasts through the module API
- `comp-navigation-menu` - Coordinate navigation menu panels through the root announcements
- `comp-calendar` - Select calendar values in the mode's shape
- `comp-form` - Drive forms through the createForm controller signals
- `comp-input-otp` - Let inputOtp own the caret and read the code through its value
- `comp-scroll-surfaces` - Compose scrollArea and messageScroller through their members
- `comp-slider` - Drive slider values as thumb arrays and commit on release

### State ownership (state)

- `state-controlled-accessor` - A controlled accessor reports; it never flips internal state
- `state-signals-not-factories` - Keep state in your signals; factories return parts

Full rule text, incorrect/correct examples, and source references: `AGENTS.md` in this folder (compiled from `rules/` by `vp run skills-build`).

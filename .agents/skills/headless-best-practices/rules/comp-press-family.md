---
title: Use the press factories for toggles, checkboxes, and groups
impact: HIGH
impactDescription: hand-rolled pressed-state buttons drift from the aria contracts, and the groups' exclusion semantics (single "" deselect, radio never-unset) are easy to get half right
tags: toggle, checkbox, toggleSwitch, toggleGroup, radioGroup
---

## Use the press factories for toggles, checkboxes, and groups

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

---
title: Call factories in component scope and keep portaled Content under a mounted root
impact: CRITICAL
impactDescription: calling a factory per render loses state on every evaluation, and a portal anchored outside every mounted root leaks its body content on unmount
tags: popover, dialog, factory, portal, scope
---

## Call factories in component scope and keep portaled Content under a mounted root

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

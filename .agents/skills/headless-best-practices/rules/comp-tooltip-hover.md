---
title: Use tooltip and hoverCard for hover surfaces with their timing defaults
impact: MEDIUM
impactDescription: skipping the Provider group or fighting the shared skip-delay clock with ad-hoc timers delivers tooltips that lag or flicker
tags: tooltip, hoverCard, hover
---

## Use tooltip and hoverCard for hover surfaces with their timing defaults

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

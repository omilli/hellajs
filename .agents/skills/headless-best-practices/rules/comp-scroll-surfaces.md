---
title: Compose scrollArea and messageScroller through their members
impact: MEDIUM
impactDescription: hand-computed scrollbar geometry drifts from the measured viewport, and chat scroll position needs the at-bottom stickiness contract, not a scroll listener
tags: scrollArea, messageScroller, ScrollerRows
---

## Compose scrollArea and messageScroller through their members

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

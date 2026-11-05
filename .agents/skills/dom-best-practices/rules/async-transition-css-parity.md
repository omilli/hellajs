---
title: Match Transition duration to the CSS animation; appear gates first mount
impact: MEDIUM
impactDescription: duration defaults to 300ms while the CSS animation runs longer, so the element is ripped out mid-animation - or, with appear unset, the first mount plays no enter class at all
tags: Transition, animation, css, timing
---

## Match Transition duration to the CSS animation; appear gates first mount

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

---
title: Keep state in your signals; factories return parts
impact: MEDIUM
impactDescription: mirroring factory state into parallel signals desyncs the UI, and element-lifecycle state like avatar loading is never controllable at all
tags: state, signals, avatar, resetHeadless
---

## Keep state in your signals; factories return parts

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

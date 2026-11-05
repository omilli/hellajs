---
title: Coordinate navigation menu panels through the root announcements
impact: MEDIUM
impactDescription: panels portaled outside the shared viewport slot lose their measured sizing, and hand-managed open state breaks the one-open and indicator contracts
tags: navigationMenu, NavRows
---

## Coordinate navigation menu panels through the root announcements

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

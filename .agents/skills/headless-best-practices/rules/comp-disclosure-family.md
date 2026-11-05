---
title: Keep tabs and accordion content mounted under data-state
impact: MEDIUM
impactDescription: conditional unmount of disclosure bodies kills CSS collapse animations and re-mounts (and re-runs) the body content on every toggle
tags: tabs, accordion, collapsible
---

## Keep tabs and accordion content mounted under data-state

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

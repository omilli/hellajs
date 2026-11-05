---
title: registry effects are separate and accumulative; hooks stack by insertion order
impact: MEDIUM
impactDescription: registering hooks without the hooks feature loaded silently no-ops, and forgetting that effects/hooks stack means re-registering on re-render leaks duplicates
tags: registry, effects, hooks, lifecycle
---

## registry effects are separate and accumulative; hooks stack by insertion order

`registry.addEffect(node, fn)` registers `fn` as a separate effect - the element's state array owns its disposal, there is no parent link to an enclosing effect, and removal of the node drains every registered disposer. Multiple `addEffect` calls on one node stack; they all run. `registry.addHook(element, type, handler)` stacks hooks of the same type in insertion order and fires `afterMount` immediately when the element is already mounted. Two gates to know: `hook:` JSX (and `$ref`/`$collection`) load the hooks feature automatically, but a hand-built imperative consumer of `registry.addHook` must import `"@hellajs/dom/features/hooks"` itself - without the feature, `addHook` is a no-op. Register once per element lifecycle (build time), not per update.

**Incorrect (what is wrong):**

```tsx
import { registry } from "@hellajs/dom";

const badge = document.createElement("span");
// No feature import: this addHook call silently registers nothing -
// the handler never fires.
registry.addHook(badge, "afterMount", () => void 0);
```

**Correct (what is right):**

```tsx
import { registry } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import "@hellajs/dom/features/hooks";

const badge = document.createElement("span");
const status = signal("idle");

// Effects stack and are drained when the node is removed.
registry.addEffect(badge, () => {
  badge.textContent = status();
});
registry.addHook(badge, "afterMount", (el) => el?.setAttribute("data-ready", "true"));
```

Reference: `packages/dom/lib/registry.ts registry` and `packages/dom/docs/api/registry.mdx` and `packages/dom/docs/api/hook.mdx`

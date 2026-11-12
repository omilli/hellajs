---
title: Mount replaces the target's content; know the target forms and the miss throw
impact: MEDIUM
impactDescription: a selector that matches nothing throws at mount time, and mount wipes the target's existing children - static content in the mount container is destroyed, not appended to
tags: mount, target, container, shadow root
---

## Mount replaces the target's content; know the target forms and the miss throw

`mount(node, target)` takes a CSS selector string, an `Element`, or a `ShadowRoot`, defaulting to `"#app"`. A selector string resolves via `querySelector` at call time - no match throws `[dom] mount: target "<target>" not found in document`. The attach calls `replaceChildren`: every existing child of the target is replaced by the mounted tree, so never point `mount` at a container holding static content you want kept (sibling containers survive; the target's own children do not). Pass the `Element` itself when the container is already in hand - that is also how you mount into shadow roots and detached elements without selector races.

**Incorrect (what is wrong):**

```tsx
import { mount } from "@hellajs/dom";

// #app does not exist yet and the container holds a server-rendered banner
// that must survive - this throws on the miss (or wipes the banner on a hit).
const handle = mount(App, "#app");
```

**Correct (what is right):**

```tsx
import { mount } from "@hellajs/dom";

const App = () => <p>Mounted content</p>;
const host = document.getElementById("shell")!;
// Mount the element directly: no selector race, and the intent to replace
// the shell's content is explicit at the call site.
const handle = mount(App, host);
```

Reference: `packages/dom/lib/mount.ts mount` and `packages/dom/docs/api/mount.mdx`

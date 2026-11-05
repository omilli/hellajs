---
title: Slot HTML is trusted by construction - never route unsanitized user input through a slot
impact: CRITICAL
impactDescription: slot content reaches the DOM through raw() with no escaping, so user-influenced slot content is script injection (XSS)
tags: astro, slots, raw, xss, security
---

## Slot HTML is trusted by construction - never route unsanitized user input through a slot

Astro slot children reach the component as `[raw(html)]` - `raw()` marks the string as pre-rendered HTML and it is emitted verbatim, no escaping, server and client alike. That is correct for what slots are: Astro's own already-rendered output, trusted by construction. It is an XSS hole for anything user-influenced: request data interpolated into slot content (or into `set:html` handoffs) reaches the page unescaped. Keep slots for authored/trusted markup; render user text as a regular component child (text children escape normally), or sanitize with a policy-based sanitizer before the string enters a slot. The general `raw()` contract (nothing inside the boundary is reactive or hydrated) is `dom-best-practices`' raw rule.

**Incorrect (what is wrong):**

```tsx
import { raw } from "@hellajs/dom";
import type { ComponentFn } from "@hellajs/dom";

// comment.body is user input: routing it through raw() ships a script
// tag to the client verbatim
const Comment: ComponentFn = (props) => (
  <p>{[raw(String(props.body))]}</p>
);
```

**Correct (what is right):**

```tsx
import type { ComponentFn } from "@hellajs/dom";

// text children escape: user input renders as inert text
const Comment: ComponentFn = (props) => <p>{String(props.body)}</p>;
```

Reference: `plugins/astro/server.mjs mapSlots` and `packages/dom/lib/raw.ts raw` and `packages/dom/docs/api/raw.mdx`

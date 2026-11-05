---
title: raw() inserts unescaped HTML - sanitize untrusted input before it
impact: CRITICAL
impactDescription: raw() bypasses HTML escaping by design, so user-controlled strings inside it are script injection (XSS); nothing inside the boundary is reactive or hydrated
tags: raw, xss, security, hydration
---

## raw() inserts unescaped HTML - sanitize untrusted input before it

`raw(html)` wraps a string as an opaque child: the renderer parses and inserts it verbatim with no escaping, `ssr()` emits it marker-bounded and unescaped, and `hydrate` adopts the existing nodes without wiring anything inside - no reactive scope crosses the boundary. That is exactly right for pre-rendered HTML from a trusted renderer (a meta-framework's slot output, server-produced fragments). It is an XSS hole for anything user-influenced: sanitize with a policy-based sanitizer before wrapping, and never interpolate request data into the string. If the content needs reactivity, it must be a real component, not raw HTML.

**Incorrect (what is wrong):**

```tsx
import { raw } from "@hellajs/dom";
import type { ComponentFn } from "@hellajs/dom";

const Comment: ComponentFn = (props) => (
  <div>{raw(String(props.bodyHtml))}</div>
);
// props.bodyHtml comes from the request - a script tag sails through unescaped.
```

**Correct (what is right):**

```tsx
import { raw } from "@hellajs/dom";
import type { ComponentFn } from "@hellajs/dom";

declare function sanitizeHtml(dirty: string): string; // your policy-based sanitizer

const Comment: ComponentFn = (props) => (
  // Trusted renderer output only; user input is sanitized to an allowlist first.
  <div>{raw(sanitizeHtml(String(props.bodyHtml)))}</div>
);
```

Reference: `packages/dom/lib/features/raw.ts raw` and `packages/dom/docs/api/raw.mdx`

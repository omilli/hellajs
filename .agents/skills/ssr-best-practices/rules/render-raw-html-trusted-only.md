---
title: Reserve raw for trusted HTML; user content goes through interpolation
impact: CRITICAL
impactDescription: raw HTML ships verbatim, so unsanitized user input through raw() is a stored XSS hole in every delivered page
tags: ssr, raw, escaping, xss, security
---

## Reserve raw for trusted HTML; user content goes through interpolation

The walk's escaping boundary is the child classification: static template text emits raw, but every resolved interpolation value (a signal, a getter result, a prop value) is escaped (`& < > "`) before it lands in text or an attribute. `raw()` from `@hellajs/dom` is the deliberate bypass - its string ships verbatim inside a marker-bounded region that `hydrate` adopts without binding anything inside it. Route user-supplied content through interpolation so the walk escapes it; use `raw()` only for HTML you produced or sanitized yourself (your own markdown renderer's output, a meta-framework's slot content).

**Incorrect (what is wrong):**

```tsx
import { raw } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";

interface Entry {
  bio: string;
}

// raw() bypasses escaping: any markup in the user-supplied bio ships
// verbatim into every delivered page - a stored XSS hole.
const renderBio = (entry: Entry) => ssr(<section>{raw(entry.bio)}</section>);
```

**Correct (what is right):**

```tsx
import { raw } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";

interface Entry {
  bio: string;
  panelHtml: string;
}

// User content goes through the braces (escaped); raw() is reserved for
// HTML your own pipeline produced and vouches for.
const renderEntry = (entry: Entry) =>
  ssr(
    <section>
      <p>{entry.bio}</p>
      {raw(entry.panelHtml)}
    </section>,
  );
```

Reference: `packages/ssr/lib/ssr.ts walkChild` and `packages/ssr/docs/concepts/ssr.mdx`

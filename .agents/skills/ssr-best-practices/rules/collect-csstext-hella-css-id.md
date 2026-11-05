---
title: Deliver cssText through a hella-css tagged style element
impact: HIGH
impactDescription: a delivered sheet without the hella-css id gives the client nothing to adopt, so hydration re-registers the same rules into a fresh element - duplicated styles and a window of unstyled content
tags: collect, css, csstext, hella-css, adoption
---

## Deliver cssText through a hella-css tagged style element

`@hellajs/css` registers rules on the server too (`css()`, `style()`, `vars()` all work without a DOM), and `cssText()` collects the generated text after the registrations run. `ssr` never imports `@hellajs/css` - the caller assembles both sides. Deliver the collected text through a `<style>` element carrying the `hella-css` id and the client adopts it: the first registration after hydration finds the existing element, verifies the delivered rules against what the platform parsed, and claims them in place (no duplicate insert, no flash of unstyled content). A tag without the id still styles the page (class names agree) but the client registers a fresh element and the DOM carries both rule sets. When the page uses `vars()`, mirror the client's two-element split with `cssText.css()` and `cssText.vars()`, each in its own adoptable tag.

**Incorrect (what is wrong):**

```tsx
import { css, cssText } from "@hellajs/css";
import { doc } from "@hellajs/ssr";

css({ ".card": { border: "1px solid #ccc" } });

// head.styles emits a bare <style> with no hella-css id: the client cannot
// adopt the delivered sheet and registers the same rules again - duplicates.
const page = doc({
  body: '<div class="card">Hi</div>',
  head: { styles: [cssText()] },
});
```

**Correct (what is right):**

```tsx
import { css, cssText } from "@hellajs/css";
import { doc } from "@hellajs/ssr";

css({ ".card": { border: "1px solid #ccc" } });

// head.raw carries the collected text inside a hella-css tagged element;
// the client adopts it in place (no duplicate insert, no unstyled flash).
const page = doc({
  body: '<div class="card">Hi</div>',
  head: { raw: `<style id="hella-css">${cssText()}</style>` },
});
```

Reference: `packages/css/docs/api/csstext.mdx` and `packages/ssr/docs/api/ssr.mdx`

---
title: Render portal content inline when it must ship in the HTML
impact: MEDIUM
impactDescription: a portal serializes as an empty marker region, so relying on it for server output silently drops the content from the HTML
tags: ssr, portal, teleport, empty
---

## Render portal content inline when it must ship in the HTML

`Portal` teleports its children to a DOM target; there is no document on the server, so the `portal` kind of the isDynamic dispatch renders nothing - the region serializes as an empty marker pair `<!--[--><!--]-->` and never throws. Content that must appear in the server HTML (modals whose markup matters for SEO or first paint, overlays above the fold) belongs inline in the tree; keep the portal variant for the client build where a live document exists.

**Incorrect (what is wrong):**

```tsx
import { Portal } from "@hellajs/dom";
import { ssr } from "@hellajs/ssr";

// The server has no #modal-root to teleport into: this serializes as an
// empty region and the terms never reach the HTML.
const body = ssr(
  <main>
    <Portal to="#modal-root">
      <div class="modal">Terms of service</div>
    </Portal>
  </main>,
);
```

**Correct (what is right):**

```tsx
import { ssr } from "@hellajs/ssr";

// Render the content inline when it must ship; the client build can move
// it after hydrate if the portal layout is still wanted.
const body = ssr(
  <main>
    <div class="modal">Terms of service</div>
  </main>,
);
```

Reference: `packages/ssr/lib/ssr.ts renderDynamic` and `packages/ssr/docs/api/ssr.mdx`

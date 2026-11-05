---
title: Consume slots as props.children and props.<name> - they arrive as rendered HTML
impact: HIGH
impactDescription: fighting the mapped shape (calling it as a function, joining it, expecting a string) throws or double-escapes the pre-rendered slot HTML
tags: astro, slots, children, props
---

## Consume slots as props.children and props.<name> - they arrive as rendered HTML

Astro hands the renderer pre-rendered slot HTML (`slots: Record<name, htmlString>`); the integration maps each entry to a `[raw(html)]` child array - the default slot onto `props.children`, named slots onto `props[name]`. The server and client entries apply the identical mapping, so the server output and the hydrated client see the same shape (valid through any children shape the component template consumes). Consume the prop directly in JSX - `<main>{props.children}</main>`, `<header>{props.header}</header>` - and do not adapt it: it is not a function to call, not a string to join or interpolate, and not a slot-renderer API from another framework.

**Incorrect (what is wrong):**

```tsx
import type { ComponentFn } from "@hellajs/dom";

// slots are not functions: the mapped value is a child array carrying
// pre-rendered HTML - calling it throws during the server render
const Card: ComponentFn = (props) => {
  const children = props.children as () => unknown;
  return <main>{children()}</main>;
};
```

**Correct (what is right):**

```tsx
import type { ComponentFn, HellaNode } from "@hellajs/dom";

// default slot -> props.children, named slots -> props[name]:
// render the child arrays as-is
const Card: ComponentFn = (props) => (
  <main>
    <header>{props.header as HellaNode[]}</header>
    {props.children as HellaNode[]}
  </main>
);
```

Used as `<Card><h1>Hi</h1><p slot="header">Title</p></Card>` in the `.astro` page.

Reference: `plugins/astro/server.mjs mapSlots` and `plugins/astro/client.mjs` and `plugins/astro/tests/renderToStaticMarkup.test.ts`

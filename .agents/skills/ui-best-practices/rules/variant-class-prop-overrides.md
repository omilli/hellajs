---
title: Override through the class prop; the copy composes it last
impact: MEDIUM
impactDescription: reaching past the class prop (blind class edits, cascade fights) misses the one composition point every copy owns
tags: class, override, cn, cascade
---

## Override through the class prop; the copy composes it last

Every copied component destructures `class` and places it as the final member of its class composition (`[base, variants[variant], sizes[size], cls]` in the css copy), with the remaining attributes spread after it. That position is the override contract: in the css flavor your classes join the plain array and precedence resolves through the normal cascade - registry declarations are unlayered CSS, so an author stylesheet imported after the theme wins equal-specificity ties, and a more specific selector wins otherwise. In the tailwind flavor the composition runs through `cn` (clsx plus tailwind-merge), so a same-group utility from the `class` prop (`bg-blue-600` against a baked `bg-primary`) mechanically wins. Retinting the whole palette is theme work; restyling one instance is a `class` prop.

**Incorrect (what is wrong):**

```tsx
import { mount } from "@hellajs/dom";

// Fighting the composition: bypassing the copy's class prop and restyling
// through a global selector beats today's cascade and breaks with every
// registry refresh - and !important chains only grow.
const App = () => <button class="my-btn-override">Go</button>;

mount(App, "#app");
```

**Correct (what is right):**

```tsx
import { mount } from "@hellajs/dom";

// The copy composes the class prop LAST: css flavor as the final array
// member (the cascade settles ties), tailwind flavor as cn's final argument
// (tailwind-merge keeps the prop's utilities, drops same-group conflicts).
function Button(props: { class?: string; children?: string }): JSX.Element {
  return (
    <button class={["inline-flex rounded-md", props.class]}>{props.children}</button>
  );
}

const App = () => <Button class="w-full">Go</Button>;

mount(App, "#app");
```

Reference: `packages/ui/registry/button/button.tsx` and `packages/ui/docs/concepts/theming.mdx`

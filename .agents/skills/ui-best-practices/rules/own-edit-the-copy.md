---
title: Customize by editing the copied file; it is your code
impact: MEDIUM
impactDescription: re-export shims and registry reach-backs fight the ownership model - the one file that matters drifts behind an indirection
tags: customization, ownership, edit
---

## Customize by editing the copied file; it is your code

Each copy is a self-contained project file: markup, props, and the style declarations spliced in for the chosen variant, importing only the peer packages and the sibling files the CLI copied beside it. Editing it is the supported customization path - change the markup, add a prop, retune the style declarations; nothing upstream can drift out from under you because nothing upstream exists at runtime. Do not wrap copies in re-export shims, and do not reach back into `node_modules/@hellajs/ui/registry/**` - that is the registry's canonical form (marker regions, unspliced style placeholders), not the component you added.

**Incorrect (what is wrong):**

```ts
// A re-export shim over "the real source" in the registry folder: the
// canonical is a splice template (marker regions, undefined style bindings),
// and the subpath resolves nowhere through the package exports map anyway.
export { Button } from "@hellajs/ui/registry/button/button";
```

**Correct (what is right):**

```tsx
import { mount } from "@hellajs/dom";

// src/components/button.tsx is yours after the copy - edit markup, widen
// props, change classes. The copy imports only the peers beside it.
function SaveButton(props: { class?: string; children?: string }): JSX.Element {
  return (
    <button type="submit" class={["ui-btn", props.class]}>
      {props.children}
    </button>
  );
}

const App = () => <SaveButton class="ui-btn-wide">Save</SaveButton>;

mount(App, "#app");
```

Reference: `packages/ui/docs/concepts/installation.mdx` and `packages/ui/registry/button/button.tsx`

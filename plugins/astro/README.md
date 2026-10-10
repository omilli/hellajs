# astro-plugin-hellajs

Astro 7 integration for [HellaJS](https://github.com/omilli/hellajs). Render `.jsx`/`.tsx` HellaJS components server-side via `@hellajs/ssr` and hydrate them on the client behind `client:*` directives: first-class HellaJS in `.astro` pages.

## Install

```bash
npm install astro-plugin-hellajs @hellajs/core @hellajs/dom @hellajs/ssr @hellajs/css
```

## Configure

Add the integration to `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import hellajs from 'astro-plugin-hellajs';

export default defineConfig({
  integrations: [hellajs()],
});
```

## Usage

```astro
---
// src/pages/index.astro
import Counter from '../Counter.tsx';
---
<Counter client:load initial={0} />
```

```tsx
// src/Counter.tsx
import { signal } from "@hellajs/core";

export default function Counter({ initial = 0 }) {
  const count = signal(initial);
  return <button on:click={() => count(count() + 1)}>{count()}</button>;
}
```

The server renders the component to HTML with `<!--[-->…<!--]-->` markers; the client `hydrate()`s it in place. All `client:*` directives are supported (`load`, `idle`, `visible`, `media`, `only`); the markers survive Astro's island serialization.

`client:only` islands carry the renderer name as the directive value (`client:only="astro-hellajs"`): Astro skips server-side framework detection for client-only components and needs the name explicitly.

A complete walkthrough lives in the [Astro Islands tutorial](https://hellajs.com/learn/tutorials/astro-islands).

## Frontmatter styles

Statically evaluable `css()`, `style()`, and `keyframes()` calls in `.astro` frontmatter compile at build: the integration folds each call against the real `@hellajs/css` package and replaces it with its class or name literal. The collected CSS splits by channel: rules from the page's own module ride Astro's pipeline as a page-scoped `<style>` in the built head, and rules collected from imported island modules ride a `<style id="hella-css">` in the page, which hydration claims against the islands' re-registrations so those rules never duplicate. No client-side CSS ships for frontmatter styles.

```astro
---
// src/pages/index.astro
import { keyframes, style } from "@hellajs/css";

const card = style({
  padding: "1rem",
  "&:hover": { color: "hotpink" },
}, { label: "card" });
const spin = keyframes({
  from: { opacity: 0 },
  to: { opacity: 1 },
});
---
<div class={card} style={`animation: ${spin} 1s linear`}>Hello</div>
```

### Folding rules

Call arguments must be statically evaluable: literals, objects, arrays, and template literals fold; `const` bindings in the module fold; imported bindings from local modules fold recursively through their source. `cx()` compositions and `cva()` recipes fold to their string results.

### Positional policy

A frontmatter creator call with non-foldable arguments fails the build and points at the escape hatch below. `vars()` in a page throws: its reactivity is dead server-side. Inside imported modules the same calls are collected only when their arguments fold; non-foldable calls are ignored silently (island runtime owns them). An imported `vars()` runs at extraction so its returned reference object binds, and property chains on bound objects (`tokens.mutedForeground`) fold to their values in either position; the sheet registration itself is discarded - its static delivery is the layout's `cssText()` flush, so an extracted copy would only duplicate it per importing module.

### Opt-out and dynamic styles

A page importing and referencing `cssText` keeps byte-identical behavior: the integration leaves it untouched. That is also the escape hatch for dynamic styles: move them to a module and collect with `cssText()`, as shown under [Styling](#styling).

Islands keep runtime registration. Rules collected from island modules ship inside the page's `<style id="hella-css">`: hydration adopts that element once, claiming the delivered rules against the islands' re-registrations so each exists exactly once.

## Styling

Frontmatter styles that the integration can fold compile to page-scoped CSS on their own (see [Frontmatter styles](#frontmatter-styles)). For dynamic styles, collect what [`@hellajs/css`](https://hellajs.com/reference/css/css) registered with [`cssText`](https://hellajs.com/reference/css/csstext) and inline it once in your page so server-rendered HTML is styled at first paint; referencing `cssText` also opts the page out of extraction:

```astro
---
import { styles } from '../theme';
---
<head>
  <style is:inline set:html={styles} />
</head>
```

`client:only` islands import the same theme module and inject their rules themselves when they load; hashed class names match on both sides.

## Exclusive use

This integration wires `vite-plugin-hellajs`, which transforms **all** `.jsx`/`.tsx`/`.js`/`.ts` (excluding `node_modules`). It assumes HellaJS is the project's only JSX framework; mixing React/Solid/etc. in the same project is unsupported.

---
title: Register hellajs() once, in the integrations array, as a default import
impact: CRITICAL
impactDescription: hand-wiring the vite plugin registers no renderer: pages cannot use HellaJS components, islands never hydrate, and the server resolves the dom arm
tags: astro, registration, integrations, renderer
---

## Register hellajs() once, in the integrations array, as a default import

Register the integration's default export once in `astro.config.mjs`: `import hellajs from "astro-plugin-hellajs"` and `integrations: [hellajs()]`. The package's exports map exposes only the root, carrying a single default export - there is no named export to destructure and no second entry to wire. One registration installs all four pieces: the HellaJS vite plugin (JSX transform), the frontmatter `css()`/`style()`/`keyframes()` extraction, the `ssr` export condition on the server environments, and the framework renderer (server `renderToStaticMarkup` -> `@hellajs/ssr`, client `hydrate`). Hand-registering `vite-plugin-hellajs` under `vite.plugins` instead transforms JSX but registers no renderer: `.astro` pages cannot render the components, no island hydrates, and JSX-bearing `@hellajs/*` packages resolve the dom arm on the server.

**Incorrect (what is wrong):**

```ts
import { defineConfig } from "astro/config";
import viteHellaJS from "vite-plugin-hellajs";

export default defineConfig({
  // hand-wired vite plugin: no renderer, no frontmatter extraction,
  // no ssr conditions - islands cannot hydrate
  vite: { plugins: [viteHellaJS()] },
});
```

**Correct (what is right):**

```ts
import { defineConfig } from "astro/config";
import hellajs from "astro-plugin-hellajs";

export default defineConfig({
  integrations: [hellajs()],
});
```

Reference: `plugins/astro/index.mjs hellajs` and `plugins/astro/package.json` and `examples/astro-islands/astro.config.mjs`

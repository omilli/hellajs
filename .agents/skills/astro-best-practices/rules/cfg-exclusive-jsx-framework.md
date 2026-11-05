---
title: Treat the integration as exclusive-use: HellaJS is the only JSX framework
impact: CRITICAL
impactDescription: the transform rewrites every JSX file and the renderer claims every function component, so a second framework's JSX is mangled and over-claimed
tags: astro, exclusivity, jsx, frameworks
---

## Treat the integration as exclusive-use: HellaJS is the only JSX framework

The integration wires `vite-plugin-hellajs`, which transforms every `.js`, `.ts`, `.jsx`, and `.tsx` module (skipping only `node_modules`), and its renderer `check` claims every function component (`typeof Component === "function"`). There is no include/exclude scoping and no per-framework detection to rely on: adding a second JSX integration (React, Solid) to the same project is unsupported - whichever transform runs first rewrites the other framework's JSX into HellaJS shape, and `check` over-claims components it cannot meaningfully render. Keep one JSX framework per Astro project; embed foreign-framework output as pre-rendered HTML or split the project.

**Incorrect (what is wrong):**

```ts
import { defineConfig } from "astro/config";
import hellajs from "astro-plugin-hellajs";
import react from "@astrojs/react";

export default defineConfig({
  // two JSX frameworks: the HellaJS transform rewrites React JSX,
  // and check() claims every function component regardless of origin
  integrations: [hellajs(), react()],
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

Reference: `plugins/astro/index.mjs` and `plugins/astro/server.mjs check` and `plugins/astro/README.md`

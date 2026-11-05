---
title: Call hellajs() with no arguments - the integration has no options surface
impact: LOW
impactDescription: invented options are silently ignored, so config that appears to work is coincidence and the real levers do not exist
tags: astro, options, api-surface
---

## Call hellajs() with no arguments - the integration has no options surface

`hellajs()` accepts no parameters and returns the `AstroIntegration`; any argument passed is ignored. There is no options object to invent: no `target` (JSX emission is wrapper-owned per build environment - the server compiles HellaNode for `@hellajs/ssr`, the client hydrates, island code is identical either way), no `include`/`exclude` (exclusivity is the contract, the vite plugin skips only `node_modules`), no `ssr` toggle (the condition wiring is built in). If a project needs one of those levers, it is a feature request against the plugin, not a config flag to guess.

**Incorrect (what is wrong):**

```ts
import hellajs from "astro-plugin-hellajs";

// invented options: silently ignored - no scoping, no target, no exclusions
hellajs({ include: ["src/islands/**"], target: "dom" });
```

**Correct (what is right):**

```ts
import { defineConfig } from "astro/config";
import hellajs from "astro-plugin-hellajs";

export default defineConfig({
  integrations: [hellajs()],
});
```

Reference: `plugins/astro/index.mjs hellajs` and `plugins/astro/index.d.ts`

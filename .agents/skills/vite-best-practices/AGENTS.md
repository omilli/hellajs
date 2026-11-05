# vite-best-practices

Compiled by `vp run skills-build` from `rules/` - never hand-edit; regenerate instead.

Best practices for vite-plugin-hellajs, the thin Vite wrapper around hellajs-compiler: registering the viteHellaJS() default export in the plugins array, the single target option (unset it resolves per build environment: server builds emit ast HellaNode for @hellajs/ssr, client builds emit dom @hellajs/dom/runtime construction), eager option validation at construction, bare-specifier resolution of @hellajs/* packages with no aliasing, declaring the runtime packages compiled output imports, and keeping one JSX pipeline per config. Every rule is grounded in the wrapper source and the example configs.

- Version: 1.0.0
- Organization: HellaJS
- Date: 2026-11-05

## Impact levels

| Level | Meaning |
|---|---|
| CRITICAL | Breaks correctness: lost reactivity, leaks, glitching, hydration mismatch, data loss |
| HIGH | Measurable perf or UX degradation the library exists to prevent |
| MEDIUM | Suboptimal: works but fights the library's model |
| LOW | Convention or consistency |

## Contents
- 1. Registration and options
  - 1.1 Read a construction-time throw as an options error, never catch past it (`cfg-invalid-options-throw-at-construction`)
  - 1.2 Register viteHellaJS() once, in the root plugins array, as a default import (`cfg-register-default-export`)
  - 1.3 Omit target unless one currency is wanted in every environment (`cfg-target-omit-unless-pinning`)
- 2. Module resolution
  - 2.1 Import vite-plugin-hellajs and @hellajs/* as bare specifiers, no aliasing (`res-bare-specifiers-no-alias`)
  - 2.2 Declare every @hellajs/* package the app compiles against (`res-declare-runtime-packages`)
- 3. Boundaries
  - 3.1 Keep one JSX pipeline - no second JSX plugin beside viteHellaJS() (`bound-single-jsx-transform`)
  - 3.2 Engine questions are compiler-best-practices ground; the wrapper only wires them (`bound-transform-semantics-are-compiler-owned`)

## 1. Registration and options

### 1.1 Read a construction-time throw as an options error, never catch past it

**Impact: MEDIUM** - swallowing the throw boots a config whose plugin never registered, and the app fails on untransformed JSX far from the cause

`viteHellaJS()` validates its options eagerly: the wrapper probes the engine once at construction, so an invalid `target` (or any option the engine rejects) throws while the config loads - before any file transforms. Treat that throw as configuration feedback and fix the option; never wrap the call in try/catch to boot anyway. A caught error means the plugin object never reached `plugins`, and every JSX module then fails later with a syntax error far from the real cause. The same eager probe means a config that loads is a config whose options are valid - no defensive re-validation needed.

**Incorrect (what is wrong):**

```ts
import { defineConfig } from "vite";
import viteHellaJS from "vite-plugin-hellajs";

const plugins = [];
try {
  plugins.push(viteHellaJS({ target: "js" }));
} catch {
  // swallowed: no plugin registered, JSX ships untransformed
}

export default defineConfig({ plugins });
```

**Correct (what is right):**

```ts
import { defineConfig } from "vite";
import viteHellaJS from "vite-plugin-hellajs";

// An invalid option throws at this call, during config load, naming the
// option; a valid config needs no defensive code around it.
export default defineConfig({
  plugins: [viteHellaJS()],
});
```

Reference: `plugins/vite/index.mjs viteHellaJS`

### 1.2 Register viteHellaJS() once, in the root plugins array, as a default import

**Impact: CRITICAL** - a misregistered plugin transforms nothing and the dev server serves raw JSX as a syntax error

Register the factory's default export once, in the root `plugins` array of `vite.config`: `import viteHellaJS from "vite-plugin-hellajs"`. The package's exports map exposes only the root, carrying a single default export (`viteHellaJS(options?)`) - there is no named export to destructure. The plugin sets `enforce: "pre"` itself and runs the same transform hook in the dev server, the client build, and the SSR pipeline, so one registration covers everything: no ordering config, no `apply` guard, no second SSR registration. `build.rollupOptions.plugins` is build-only - a plugin registered there never reaches the dev server, which then serves untransformed JSX.

**Incorrect (what is wrong):**

```ts
import { defineConfig } from "vite";
import { viteHellaJS } from "vite-plugin-hellajs"; // no named export exists

export default defineConfig({
  // build-only placement: the dev server serves untransformed JSX
  build: { rollupOptions: { plugins: [viteHellaJS()] } },
});
```

**Correct (what is right):**

```ts
import { defineConfig } from "vite";
import viteHellaJS from "vite-plugin-hellajs";

export default defineConfig({
  plugins: [viteHellaJS()],
});
```

Reference: `plugins/vite/index.mjs viteHellaJS` and `plugins/vite/package.json` and `examples/counter/vite.config.js`

### 1.3 Omit target unless one currency is wanted in every environment

**Impact: CRITICAL** - a pinned dom target starves SSR builds of HellaNode and the server renders nothing

Leave `target` unset in app configs. Unset, the wrapper resolves the emission currency per build environment: server builds (an `ssr: true` module request, or a Vite 6+ environment whose consumer is `"server"`) emit `"ast"` - HellaNode objects, `@hellajs/ssr`'s input - and client builds emit `"dom"` - imperative `@hellajs/dom/runtime` construction. An explicit `target` wins verbatim in BOTH pipelines: `{ target: "dom" }` hands the SSR pipeline runtime construction code where the stringifier needs HellaNode; `{ target: "ast" }` ships HellaNode objects to the browser. Pin only to force one currency everywhere deliberately; there is no per-environment override shape - the option is global to the plugin instance.

**Incorrect (what is wrong):**

```ts
import { defineConfig } from "vite";
import viteHellaJS from "vite-plugin-hellajs";

// SSR app with a pinned client currency: server modules no longer
// emit HellaNode, so @hellajs/ssr has nothing to stringify.
export default defineConfig({
  plugins: [viteHellaJS({ target: "dom" })],
});
```

**Correct (what is right):**

```ts
import { defineConfig } from "vite";
import viteHellaJS from "vite-plugin-hellajs";

// server builds resolve "ast", client builds resolve "dom"
export default defineConfig({
  plugins: [viteHellaJS()],
});
```

Reference: `plugins/vite/index.mjs viteHellaJS` and `plugins/vite/README.md` and `examples/ssr-streaming/vite.config.js`


## 2. Module resolution

### 2.1 Import vite-plugin-hellajs and @hellajs/* as bare specifiers, no aliasing

**Impact: MEDIUM** - alias and deep-path imports bypass the package exports maps and drift from published resolution

Install `vite-plugin-hellajs` and the `@hellajs/*` packages as regular dependencies and import them as bare specifiers. The wrapper's compiled output imports `@hellajs/dom/runtime` - a bare specifier Vite resolves through that package's exports map, exactly like any dependency - and the plugin package itself exports only its root (`"."` resolving `index.mjs`/`index.d.ts`); deep paths such as `vite-plugin-hellajs/index.mjs` are outside the contract. No `resolve.alias` and no path mapping `@hellajs/*` to a source checkout: an alias replaces the specifier before dependency resolution, shadowing the installed package with whatever shape the alias target happens to have that day.

**Incorrect (what is wrong):**

```ts
import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";
import viteHellaJS from "vite-plugin-hellajs/index.mjs"; // deep path, outside exports

export default defineConfig({
  plugins: [viteHellaJS()],
  resolve: {
    alias: {
      // shadows the installed package with a local source checkout
      "@hellajs/dom": fileURLToPath(new URL("../hellajs/packages/dom/lib", import.meta.url)),
    },
  },
});
```

**Correct (what is right):**

```ts
import { defineConfig } from "vite";
import viteHellaJS from "vite-plugin-hellajs";

// npm install vite-plugin-hellajs @hellajs/core @hellajs/dom
// every specifier resolves bare, through the exports maps
export default defineConfig({
  plugins: [viteHellaJS()],
});
```

Reference: `plugins/vite/package.json` and `plugins/vite/index.mjs viteHellaJS` and `packages/headless/dist/avatar.js`

### 2.2 Declare every @hellajs/* package the app compiles against

**Impact: HIGH** - an undeclared runtime package fails the build on an unresolvable @hellajs/dom/runtime import

`vite-plugin-hellajs` transforms code; it provides no runtime. Every JSX module compiles to imports from `@hellajs/dom/runtime` - see any compiled artifact, e.g. `import { template as _hellaTemplate, mark as _hellaMark, ... } from "@hellajs/dom/runtime"` - and app code imports the packages directly (`@hellajs/core` signals, `@hellajs/dom` `mount`, `@hellajs/css` `style`). Each package the app touches must be present in the project's own dependencies; Vite resolves those specifiers like any other import, and a missing package surfaces as "Failed to resolve import" against a specifier the app never wrote by hand. When that error points at `@hellajs/*`, check `package.json` first, not the plugin config.

**Incorrect (what is wrong):**

```tsx
// package.json declares only the build plugin:
// { "devDependencies": { "vite-plugin-hellajs": "^0.8.9" } }
import { signal } from "@hellajs/core";
import { mount } from "@hellajs/dom";

// The JSX below compiles to `import { ... } from "@hellajs/dom/runtime"` -
// not installed: the build fails with "Failed to resolve import
// \"@hellajs/dom/runtime\"" against a specifier never written by hand.
const count = signal(0);
const App = () => <button on:click={() => count(count() + 1)}>{count}</button>;

mount(App, "#app");
```

**Correct (what is right):**

```tsx
// package.json dependencies include the packages the app compiles against:
// "@hellajs/core", "@hellajs/dom" (plus "vite-plugin-hellajs" for the config)
import { signal } from "@hellajs/core";
import { mount } from "@hellajs/dom";

const count = signal(0);
const App = () => <button on:click={() => count(count() + 1)}>{count}</button>;

mount(App, "#app");
```

Reference: `plugins/vite/index.mjs viteHellaJS` and `packages/headless/dist/avatar.js` and `examples/counter/src/main.jsx`


## 3. Boundaries

### 3.1 Keep one JSX pipeline - no second JSX plugin beside viteHellaJS()

**Impact: MEDIUM** - a second transform claims the same .tsx files and layers dead dev-mode machinery over already-compiled output

`viteHellaJS()` runs with `enforce: "pre"` and claims every `.js`/`.ts`/`.jsx`/`.tsx` app file outside `node_modules`: by the time later plugins see a module, its JSX is already compiled. Do not add `@vitejs/plugin-react`, an esbuild JSX configuration, or any other JSX-transforming plugin to the same config - at best it is dead weight scanning compiled output, at worst two pipelines disagree over who owns `.tsx`. The wrapper needs no ordering help from the config: its `enforce` is set internally, before Vite's own transforms.

**Incorrect (what is wrong):**

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import viteHellaJS from "vite-plugin-hellajs";

export default defineConfig({
  // two JSX pipelines: react() and viteHellaJS() both claim .tsx
  plugins: [react(), viteHellaJS()],
});
```

**Correct (what is right):**

```ts
import { defineConfig } from "vite";
import viteHellaJS from "vite-plugin-hellajs";

export default defineConfig({
  plugins: [viteHellaJS()],
});
```

Reference: `plugins/vite/index.mjs viteHellaJS` and `plugins/vite/README.md`

### 3.2 Engine questions are compiler-best-practices ground; the wrapper only wires them

**Impact: LOW** - reasoning about transform internals from the Vite config leads to re-implementing behavior the wrapper already forwards

The wrapper forwards to `hellajs-compiler` and owns no transform semantics: the `{ code, map }` it returns to Vite carries the engine's already-chained sourcemap, and a `null` return (a JSX-free file) hands the module to Vite's native esbuild pass - which is what strips TS types; the pipeline never typechecks. Questions about output shape, sourcemap chaining, `lang` resolution for virtual ids, or the null contract belong to `compiler-best-practices`; this skill covers host wiring only. Same split for other hosts: Rollup builds route to `rollup-best-practices`, the Astro renderer to `astro-best-practices`. Do not re-implement the wrapper's filter/target/null contract in a config-local plugin - a missing wrapper option is a feature request, not a reason to hand-roll the integration.

**Incorrect (what is wrong):**

```ts
import { defineConfig } from "vite";
import { transform } from "hellajs-compiler";
import viteHellaJS from "vite-plugin-hellajs";

// Re-implementing the wrapper from the config: the extension filter,
// per-environment target, and null contract are already owned by viteHellaJS().
export default defineConfig({
  plugins: [
    viteHellaJS(),
    {
      name: "hella-retransform",
      transform(code, id) {
        return transform(code, { filename: id });
      },
    },
  ],
});
```

**Correct (what is right):**

```ts
import { defineConfig } from "vite";
import viteHellaJS from "vite-plugin-hellajs";

// JSX-free .ts files return null from the wrapper and fall through to
// Vite's native TS strip; nothing further belongs in this config.
export default defineConfig({
  plugins: [viteHellaJS()],
});
```

Reference: `plugins/vite/index.mjs viteHellaJS` and `.agents/skills/compiler-best-practices`


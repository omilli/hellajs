# rollup-best-practices

Compiled by `vp run skills-build` from `rules/` - never hand-edit; regenerate instead.

Best practices for rollup-plugin-hellajs, the thin Rollup wrapper around hellajs-compiler: importing and calling the rollupHellaJS() default export in the plugins array, ordering the factory ahead of plugins that consume compiled output (its enforce field is inert under plain Rollup - the array position is the ordering control), the single target option (dom - imperative @hellajs/dom/runtime construction - is the default in every build, with no per-environment resolution; ast is pinned explicitly when the bundle runs server-side and feeds @hellajs/ssr), the options surface ending at target (extra keys are silently ignored), eager target validation at construction, and keeping one JSX pipeline per config. Every rule is grounded in the wrapper source, its target-option test suite, and the bench example config.

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
- 1. Registration and ordering
  - 1.1 Order rollupHellaJS() ahead of plugins that consume compiled output (`cfg-order-transforms-before-consumers`)
  - 1.2 Register rollupHellaJS() once, in the plugins array, as a called default import (`cfg-register-default-export`)
- 2. Options surface
  - 2.1 Read a construction-time throw as a target error, never catch past it (`opt-invalid-target-throws-at-construction`)
  - 2.2 Pass only target - every other key is silently ignored (`opt-surface-is-target-only`)
  - 2.3 Omit target for client bundles, pin ast only for a server target (`opt-target-omit-unless-server`)
- 3. Boundaries
  - 3.1 Keep one JSX pipeline - rollupHellaJS() owns JSX lowering (`bound-single-jsx-transform`)
  - 3.2 Engine questions are compiler-best-practices ground; the wrapper only wires them (`bound-transform-semantics-are-compiler-owned`)

## 1. Registration and ordering

### 1.1 Order rollupHellaJS() ahead of plugins that consume compiled output

**Impact: HIGH** - a consumer plugin earlier in the array sees raw JSX or raw TS and the build fails on modules the wrapper was about to own

The wrapper's `transform` hook claims every `.js`/`.ts`/`.jsx`/`.tsx` module outside `node_modules`, and Rollup runs `transform` hooks in plugins-array order. Put the wrapper before plugins that consume compiled output - minifiers above all. The plugin object carries `enforce: "pre"`, but `enforce` is a Vite field: under plain Rollup it is inert, and the array position is the only ordering control. Match the bench config's shape - TypeScript first (type-check and TS strip, JSX preserved), the wrapper second, `node-resolve` for the bare `@hellajs/*` specifiers compiled output imports, the minifier last.

**Incorrect (what is wrong):**

```ts
import rollupHellaJS from "rollup-plugin-hellajs";
import terser from "@rollup/plugin-terser";

export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  // terser parses the raw .tsx before the wrapper compiles it -
  // enforce "pre" does not reorder anything under plain Rollup
  plugins: [terser(), rollupHellaJS()],
};
```

**Correct (what is right):**

```ts
import typescript from "@rollup/plugin-typescript";
import rollupHellaJS from "rollup-plugin-hellajs";
import resolve from "@rollup/plugin-node-resolve";

export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  plugins: [typescript(), rollupHellaJS(), resolve()],
};
```

Reference: `plugins/rollup/index.mjs rollupHellaJS` and `examples/bench/rollup.config.js`

### 1.2 Register rollupHellaJS() once, in the plugins array, as a called default import

**Impact: CRITICAL** - a misregistered plugin transforms nothing and the build fails on every JSX module as a parse error

Register the factory's default export once, in the `plugins` array of `rollup.config`: `import rollupHellaJS from "rollup-plugin-hellajs"`. The package's exports map exposes only the root, carrying a single default export (`rollupHellaJS(options?)`) - there is no named export to destructure. The array takes the plugin object the factory returns, not the factory itself: `plugins: [rollupHellaJS]` registers a bare function, so no hooks (`resolveId`, `load`, `transform`) ever run and every `.tsx` module reaches Rollup untransformed. Call it - `rollupHellaJS()` - exactly once; the returned object names itself `"rollup-plugin-hellajs"` and needs no further wiring.

**Incorrect (what is wrong):**

```ts
import { rollupHellaJS } from "rollup-plugin-hellajs"; // no named export exists

export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  // the factory is also never called: a function in the plugins array
  // registers no hooks, so JSX ships untransformed
  plugins: [rollupHellaJS],
};
```

**Correct (what is right):**

```ts
import rollupHellaJS from "rollup-plugin-hellajs";

export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  plugins: [rollupHellaJS()],
};
```

Reference: `plugins/rollup/index.mjs rollupHellaJS` and `plugins/rollup/package.json` and `examples/bench/rollup.config.js`


## 2. Options surface

### 2.1 Read a construction-time throw as a target error, never catch past it

**Impact: MEDIUM** - swallowing the throw boots a config whose plugin never registered, and the build fails on untransformed JSX far from the cause

`rollupHellaJS()` validates its option eagerly: the wrapper probes the engine once at construction - `transform("", { filename: "hellajs-validate.js", target })` - so a `target` outside `"ast"`/`"dom"` throws `[hellajs-compiler] invalid target ...` while the config loads, before any file transforms. The probe throws before the JSX sniff, so an empty input exercises only the validation. Treat that throw as configuration feedback and fix the option; never wrap the call in try/catch to boot anyway. A caught error means the plugin object never reached `plugins`, and every JSX module then fails later with a parse error far from the real cause.

**Incorrect (what is wrong):**

```ts
import rollupHellaJS from "rollup-plugin-hellajs";

const plugins = [];
try {
  plugins.push(rollupHellaJS({ target: "js" })); // not "ast" or "dom"
} catch {
  // swallowed: no plugin registered, JSX ships untransformed
}

export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  plugins,
};
```

**Correct (what is right):**

```ts
import rollupHellaJS from "rollup-plugin-hellajs";

// an invalid target throws at this call, during config load, naming the
// option; a valid config needs no defensive code around it
export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  plugins: [rollupHellaJS()],
};
```

Reference: `plugins/rollup/index.mjs rollupHellaJS` and `plugins/compiler/src/pipeline.mjs`

### 2.2 Pass only target - every other key is silently ignored

**Impact: MEDIUM** - include/exclude or engine-level options do nothing, so a config that looks scoped still transforms every js/ts/jsx/tsx module outside node_modules

`{ target }` is the entire options surface: the wrapper reads `pluginOptions.target` and nothing else. Unknown keys never reach the engine, so nothing throws and nothing applies - `rollupHellaJS({ target: "dom", extrakey: 1 })` constructs exactly the same plugin as `rollupHellaJS()`. There is no Rollup-conventional `include`/`exclude` filtering; the transform claims every `.js`/`.ts`/`.jsx`/`.tsx` module outside `node_modules` regardless. Engine-level options cannot be passed through either: `filename` and `lang` are derived from each module's id, and an invalid value surfaces as a `[hellajs-compiler]` throw naming the engine option - scope the build with `input`, not with plugin options that do not exist.

**Incorrect (what is wrong):**

```ts
import rollupHellaJS from "rollup-plugin-hellajs";

// include/exclude do not exist on this wrapper: both keys are silently
// dropped, and every js/ts/jsx/tsx module outside node_modules transforms
export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  plugins: [rollupHellaJS({ include: ["src/**"], exclude: ["src/legacy/**"] })],
};
```

**Correct (what is right):**

```ts
import rollupHellaJS from "rollup-plugin-hellajs";

// no scoping options exist; the entry graph is the scope
export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  plugins: [rollupHellaJS()],
};
```

Reference: `plugins/rollup/index.mjs rollupHellaJS` and `plugins/rollup/index.d.ts RollupHellaJSOptions`

### 2.3 Omit target for client bundles, pin ast only for a server target

**Impact: CRITICAL** - a dom-emitting bundle on the server hands @hellajs/ssr runtime construction where it needs HellaNode, and the server renders nothing

Leave `target` unset for client bundles. Unset, the wrapper emits `"dom"` - imperative `@hellajs/dom/runtime` construction - and this default holds in EVERY build: `const target = pluginOptions.target ?? "dom"`. There is no per-environment resolution here, unlike the Vite wrapper - Rollup is a client-bundle tool, and an agent moving from `vite-best-practices` must not assume an unset target auto-detects a server build. Pass `{ target: "ast" }` explicitly only when the bundle runs server-side and its modules feed `@hellajs/ssr` stringification. The option is global to the plugin instance: building both currencies means two Rollup builds, each registering the factory once with its own target.

**Incorrect (what is wrong):**

```ts
import rollupHellaJS from "rollup-plugin-hellajs";

// server bundle, unset target: emits imperative @hellajs/dom/runtime
// construction - @hellajs/ssr needs HellaNode objects and renders nothing
export default {
  input: "src/server-entry.tsx",
  output: { file: "dist/server.js", format: "es" },
  plugins: [rollupHellaJS()],
};
```

**Correct (what is right):**

```ts
import rollupHellaJS from "rollup-plugin-hellajs";

// the server bundle pins the server currency explicitly;
// a client bundle in the same project just calls rollupHellaJS()
export default {
  input: "src/server-entry.tsx",
  output: { file: "dist/server.js", format: "es" },
  plugins: [rollupHellaJS({ target: "ast" })],
};
```

Reference: `plugins/rollup/index.mjs rollupHellaJS` and `plugins/rollup/tests/target-option.test.ts` and `plugins/rollup/README.md` and `docs/src/pages/plugins/rollup.mdx`


## 3. Boundaries

### 3.1 Keep one JSX pipeline - rollupHellaJS() owns JSX lowering

**Impact: MEDIUM** - a second JSX-transforming plugin claims the same modules and the two pipelines disagree over who owns the output shape

The wrapper claims every `.js`/`.ts`/`.jsx`/`.tsx` module outside `node_modules` and lowers its JSX in one pass; by the time later plugins see a module, its JSX is already compiled. Do not add a second JSX-transforming plugin - `@rollup/plugin-swc` or babel with a JSX transform configured - to the same config: at best it is dead weight scanning compiled output, at worst two pipelines disagree over who owns `.tsx`. `@rollup/plugin-typescript` is the canonical companion, not a rival: with `"jsx": "preserve"` in tsconfig it type-checks and strips TS while leaving JSX for the wrapper - the bench config pairs exactly these two. The plugin needs no other JSX help; its own transform is the pipeline.

**Incorrect (what is wrong):**

```ts
import swc from "@rollup/plugin-swc";
import rollupHellaJS from "rollup-plugin-hellajs";

export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  // two JSX pipelines: swc lowers .tsx to createElement calls before the
  // wrapper ever sees them
  plugins: [swc({ jsc: { transform: { react: {} } } }), rollupHellaJS()],
};
```

**Correct (what is right):**

```ts
import typescript from "@rollup/plugin-typescript";
import rollupHellaJS from "rollup-plugin-hellajs";

// tsconfig.json: "jsx": "preserve" - typescript() strips TS and type-checks,
// rollupHellaJS() owns JSX lowering
export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  plugins: [typescript(), rollupHellaJS()],
};
```

Reference: `plugins/rollup/index.mjs rollupHellaJS` and `examples/bench/rollup.config.js` and `docs/src/pages/plugins/rollup.mdx`

### 3.2 Engine questions are compiler-best-practices ground; the wrapper only wires them

**Impact: LOW** - reasoning about transform internals from the Rollup config leads to re-implementing behavior the wrapper already forwards

The wrapper forwards to `hellajs-compiler` and owns no transform semantics: it derives `lang` from each module's extension, forwards `{ filename, lang, target }`, and returns the engine's `{ code, map }` with the already-chained sourcemap. A `null` return - a JSX-free file - hands the module to Rollup's native pass instead (the cheap-skip win). Questions about output shape (dom runtime construction vs HellaNode), sourcemap chaining, the pipeline stages, or the null contract belong to `compiler-best-practices`; this skill covers host wiring only. Same split for other hosts: Vite builds route to `vite-best-practices`, the Astro renderer to `astro-best-practices`. Do not re-implement the wrapper's filter/target/null contract in a config-local plugin - a missing wrapper option is a feature request, not a reason to hand-roll the integration.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";
import rollupHellaJS from "rollup-plugin-hellajs";

// re-implementing the wrapper from the config: the extension filter,
// lang derivation, and null contract are already owned by rollupHellaJS()
export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  plugins: [
    rollupHellaJS(),
    {
      name: "hella-retransform",
      transform(code, id) {
        return transform(code, { filename: id });
      },
    },
  ],
};
```

**Correct (what is right):**

```ts
import rollupHellaJS from "rollup-plugin-hellajs";

// JSX-free files return null from the wrapper and fall through to Rollup's
// native pass; nothing further belongs in this config
export default {
  input: "src/main.tsx",
  output: { file: "dist/main.js", format: "iife" },
  plugins: [rollupHellaJS()],
};
```

Reference: `plugins/rollup/index.mjs rollupHellaJS` and `.agents/skills/compiler-best-practices`


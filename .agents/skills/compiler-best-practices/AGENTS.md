# compiler-best-practices

Compiled by `vp run skills-build` from `rules/` - never hand-edit; regenerate instead.

Best practices for hellajs-compiler, the JS-glue dual-target JSX engine: transform(code, options) option surface and call-time validation, target selection (dom imperative runtime for the client, ast HellaNode for the server), the pipeline contract (oxc TS strip that never typechecks, already-chained sourcemaps, non-byte-stable output), and when to consume the vite/rollup wrappers instead of calling the engine directly. Every rule is grounded in the plugin source and test suite.

- Version: 1.0.0
- Organization: HellaJS
- Date: 2026-11-04

## Impact levels

| Level | Meaning |
|---|---|
| CRITICAL | Breaks correctness: lost reactivity, leaks, glitching, hydration mismatch, data loss |
| HIGH | Measurable perf or UX degradation the library exists to prevent |
| MEDIUM | Suboptimal: works but fights the library's model |
| LOW | Convention or consistency |

## Contents
- 1. Target selection
  - 1.1 Pass an explicit target at every call site, never the dom default (`target-explicit-at-every-call-site`)
  - 1.2 Pick the target by build environment: ast for the server, dom for the client (`target-pick-by-environment`)
- 2. Calling transform
  - 2.1 Pass lang explicitly when the module id is not a real filename (`xform-lang-explicit-when-extension-lies`)
  - 2.2 Handle the null return: JSX-free input is a pass-through, not an error (`xform-null-means-no-jsx`)
  - 2.3 Treat options as validated config: exact keys, eager probe, no catch-and-continue (`xform-options-validate-early`)
- 3. Pipeline contract
  - 3.1 Consume the returned sourcemap as-is: it is already chained (`pipe-consume-returned-sourcemap`)
  - 3.2 Assert compiler output structurally, never byte-for-byte (`pipe-output-not-byte-stable`)
  - 3.3 The TS stage strips types, it never typechecks (`pipe-strip-is-not-typecheck`)
- 4. Direct use vs wrappers
  - 4.1 A direct caller owns the whole wrapper contract: filter, target, null, map (`wrap-direct-use-owns-the-contract`)
  - 4.2 Consume the bundler wrappers for app builds, the engine only for custom pipelines (`wrap-prefer-bundler-plugins`)

## 1. Target selection

### 1.1 Pass an explicit target at every call site, never the dom default

**Impact: LOW** - an omitted target resolves to the client currency, so a server-adjacent call silently compiles the wrong output

`target` defaults to `"dom"` (the option validator substitutes it when the key is absent), and that default is deliberately the client currency: the engine cannot know which bundler environment is calling. Every real call site in this repo passes an explicit target, either per environment (the vite wrapper resolves server vs client per transform) or once at construction (the rollup wrapper's `pluginOptions.target ?? "dom"`). Relying on the default in your own integration couples the emission currency to a default you never chose; a future default flip or a copied call into a server path compiles the wrong output with no error.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";

// Omitted target: a server-side consumer of this helper silently gets
// imperative dom output instead of the HellaNode currency.
export function compile(code: string, filename: string) {
  return transform(code, { filename, lang: "tsx" });
}
```

**Correct (what is right):**

```ts
import { transform } from "hellajs-compiler";

// The caller owns the environment decision and states it.
export function compile(code: string, filename: string, target: "ast" | "dom") {
  return transform(code, { filename, lang: "tsx", target });
}
```

Reference: `plugins/compiler/src/pipeline.mjs validateOptions` and `plugins/rollup/index.mjs rollupHellaJS`

### 1.2 Pick the target by build environment: ast for the server, dom for the client

**Impact: CRITICAL** - a dom-target build handed to the server leaves the stringifier nothing to walk, and an ast build in the client bundle forfeits the hoisted-template fast path

One engine, two currencies. `target: "dom"` (the default) lowers every element and fragment to imperative `@hellajs/dom/runtime` construction: literal props fold into a hoisted `template()` html string and a `mark()`ed build fn wires the dynamic parts. `target: "ast"` emits plain HellaNode objects (`{ tag, props, children }`) with fully-static subtrees hoisted to module consts, the only shape `@hellajs/ssr`'s walk consumes (it classifies children by their `tag` field, so imperative construction output has no tree to stringify). Resolve per environment the way `vite-plugin-hellajs` does: server builds (`transformOptions.ssr === true` or a Vite 6+ server-consumer environment) get `"ast"`, client builds `"dom"`; the rollup wrapper is a client-bundle tool that defaults to dom and needs an explicit `"ast"` for server output.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";

// One hard-coded target for both arms of an SSR build: the server arm
// receives imperative runtime construction, and @hellajs/ssr has no
// HellaNode tree to walk.
const result = transform(code, { filename: id, lang: "tsx", target: "dom" });
return result ? { code: result.code, map: result.map } : null;
```

**Correct (what is right):**

```ts
import { transform } from "hellajs-compiler";

// Resolve the target per environment like vite-plugin-hellajs: server
// consumers get the ast HellaNode currency, the client the dom build.
const server = ssr === true || environment?.config?.consumer === "server";
const result = transform(code, {
  filename: id,
  lang: "tsx",
  target: server ? "ast" : "dom",
});
return result ? { code: result.code, map: result.map } : null;
```

A wrapper-level `target` option passed by the user wins verbatim over the per-environment resolution.

Reference: `plugins/compiler/index.d.ts TransformOptions` and `plugins/vite/index.mjs viteHellaJS` and `packages/ssr/lib/internal/walk.ts walkChildGen`


## 2. Calling transform

### 2.1 Pass lang explicitly when the module id is not a real filename

**Impact: MEDIUM** - virtual module ids resolve to js, so TypeScript syntax reaches the acorn parse and fails with a bare syntax error

Language resolution: an explicit `lang` wins; otherwise the filename extension decides (`.tsx`, `.ts`, `.jsx`; everything else, including `.js`, `.mjs`, and virtual ids like `\0virtual/entry`, compiles as js). Only the ts/tsx path runs the oxc strip stage, and that stage is the only thing removing type syntax, so TS source compiled as js fails the acorn parse with `[hellajs-compiler] Unexpected token`. Virtual modules, string-fed codegen, and non-extension ids must pass `lang` explicitly; real files can derive it from the extension exactly like the wrappers' `langOf`.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";

// "app/virtual-entry" carries TSX but resolves to js: the strip stage
// never runs and the acorn parse throws on the first type annotation.
const result = transform(tsxSource, { filename: "app/virtual-entry", target: "dom" });
```

**Correct (what is right):**

```ts
import { transform } from "hellajs-compiler";

// Explicit lang: the strip stage runs ahead of the parse.
const result = transform(tsxSource, {
  filename: "app/virtual-entry",
  lang: "tsx",
  target: "dom",
});
```

Reference: `plugins/compiler/src/pipeline.mjs resolveLang` and `plugins/compiler/tests/transform.test.ts` and `plugins/vite/index.mjs`

### 2.2 Handle the null return: JSX-free input is a pass-through, not an error

**Impact: MEDIUM** - destructuring the null result crashes the pipeline, and forcing every file through the transform forfeits the cheap-skip win

`transform` sniffs with `code.includes("<")` and counts replaced JSX nodes; JSX-free input returns `null` at both targets, including the empty string. The null is the cheap-skip contract: the caller hands the file back to the host bundler's native TS/esbuild pass instead of paying the pipeline (the wrappers return null from their transform hook and let Vite/Rollup handle the file). The inverse also holds: the walk replaces every JSXElement and JSXFragment, so emitted output is JSX-free and re-transforming it yields null; never chain a second JSX pass over compiler output.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";

// JSX-free files return null: this destructuring throws on the first
// plain .ts module in the graph.
const { code, map } = transform(source, { filename: id, lang: "tsx", target: "dom" });
emit(id, code, map);
```

**Correct (what is right):**

```ts
import type { TransformResult } from "hellajs-compiler";
import { transform } from "hellajs-compiler";

const result: TransformResult | null = transform(source, {
  filename: id,
  lang: "tsx",
  target: "dom",
});
// Null means no JSX: let the host bundler handle the file natively.
if (result === null) return null;
emit(id, result.code, result.map);
```

Reference: `plugins/compiler/src/pipeline.mjs transform` and `plugins/compiler/tests/transform.test.ts` and `plugins/vite/index.mjs`

### 2.3 Treat options as validated config: exact keys, eager probe, no catch-and-continue

**Impact: MEDIUM** - a typo'd option key or bad enum surfaces as a confusing first-file error instead of a fail-fast config error

`transform` validates its options at call time, before the JSX sniff: a non-object value, a key outside `{ filename, lang, target }`, a `target` outside `{ "ast", "dom" }`, or a `lang` outside `{ "js", "jsx", "ts", "tsx" }` throws a `[hellajs-compiler]`-prefixed error naming the offense. Because validation runs before the sniff, `transform("", { filename, target })` exercises only the validation path: both wrappers fire that empty-input probe at plugin construction so a misconfigured build dies at config load, not at the first JSX file. Do not catch-and-continue around these throws; a rejected config means every file compiles wrong.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";

// Typo ("targets") plus a swallow: the probe throws, the catch logs it,
// and the build proceeds with the engine default target.
try {
  transform("", { filename: "probe.js", targets: target });
} catch (error) {
  console.error("hella config rejected", error);
}
```

**Correct (what is right):**

```ts
import type { TransformOptions } from "hellajs-compiler";
import { transform } from "hellajs-compiler";

// Probe with empty input at construction: validation throws before the
// JSX sniff, so a bad target or unknown key fails the build eagerly.
const options: TransformOptions = { filename: "probe.js", target };
transform("", options);
```

Reference: `plugins/compiler/src/pipeline.mjs validateOptions` and `plugins/vite/index.mjs viteHellaJS` and `plugins/compiler/tests/transform.test.ts`


## 3. Pipeline contract

### 3.1 Consume the returned sourcemap as-is: it is already chained

**Impact: HIGH** - a dropped or hand-rebuilt map points every stack trace and breakpoint at generated code

`TransformResult.map` arrives fully composed: for ts/tsx the print-stage map resolves through the oxc strip-stage map via `@ampproject/remapping`; for js/jsx the print map ships alone. Both carry `version: 3`, `sources: [filename]`, and `sourcesContent`, at node-start granularity (expression-level original positions, sufficient for stack traces and breakpoints). Forward the object verbatim to the host bundler (`return { code: result.code, map: result.map }`); never rebuild a map from line arithmetic over the output and never run your own strip stage to chain maps, the engine already did both.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";

// The map is dropped: downstream tools attribute every position in the
// emitted code to the output file instead of the authored source.
const result = transform(code, { filename: id, lang: "tsx", target: "dom" });
return result ? { code: result.code } : null;
```

**Correct (what is right):**

```ts
import { transform } from "hellajs-compiler";

// The returned map is the composed strip-then-print chain: forward it.
const result = transform(code, { filename: id, lang: "tsx", target: "dom" });
return result ? { code: result.code, map: result.map } : null;
```

Reference: `plugins/compiler/src/pipeline.mjs buildPrintMap` and `plugins/compiler/tests/sourcemap.test.ts` and `plugins/rollup/index.mjs`

### 3.2 Assert compiler output structurally, never byte-for-byte

**Impact: LOW** - byte-pinned goldens break on any engine bump that changes formatting without changing behavior

astring is the engine's printer and its formatting is printer freedom: parsed string literals keep their authored quotes (astring prints `node.raw`), spacing and wrapping shift with printer versions. The engine's own suite never asserts byte-level output; it normalizes whitespace or compares structure, and the engine's `tests/helpers.ts` exports the `normalize` driver for exactly that. Integration tests over compiler output should assert on shape: which imports were injected, that a `mark(` build fn exists, that the emitted output re-transforms to null (the JSX-free contract).

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";

// Byte-golden: the next engine bump reformats (astring printer freedom)
// and this fails even though behavior is unchanged.
const golden = readFileSync("golden.txt", "utf8");
const result = transform("<div>{count()}</div>", { filename: "a.jsx", target: "ast" })!;
if (result.code !== golden) throw new Error("output drifted");
```

**Correct (what is right):**

```ts
import { transform } from "hellajs-compiler";

// Structural assertions: the component import landed, and the emitted
// program carries no JSX so it re-transforms to null.
const result = transform("<Button />", { filename: "a.jsx", target: "ast" })!;
if (!result.code.includes("@hellajs/dom")) throw new Error("component import missing");
if (transform(result.code, { filename: "a.jsx", target: "ast" }) !== null) {
  throw new Error("emitted output still carries JSX");
}
```

Reference: `plugins/compiler/tests/helpers.ts normalize` and `plugins/compiler/tests/transform.test.ts` and `plugins/compiler/AGENTS.md`

### 3.3 The TS stage strips types, it never typechecks

**Impact: MEDIUM** - treating the strip pass as a type gate ships type errors to runtime with zero build signal

For ts/tsx input the pipeline runs oxc-transform's `transformSync` with `jsx: "preserve"` and `sourcemap: true`: a syntax-only strip that erases annotations, generics, `satisfies`, and type-only imports before the acorn estree parse. oxc errors with severity `"Error"` throw (so broken syntax fails the build), but nothing validates types anywhere in the pipeline. A transform-only integration is type-blind by design; type safety comes from a separate `tsc --noEmit` gate over the original sources, never from the compiler's green light.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";

// The strip stage erased the annotations without checking them: this
// "validation" green-lights type errors straight into the bundle.
const compiled = transform(code, { filename: "app.tsx", lang: "tsx", target: "dom" });
if (compiled) console.log("app.tsx is valid");
```

**Correct (what is right):**

```ts
import { execSync } from "node:child_process";
import { transform } from "hellajs-compiler";

// Emission and type safety are separate gates: tsc --noEmit over the
// original sources for types, transform for output.
execSync("tsc --noEmit", { stdio: "inherit" });
const compiled = transform(code, { filename: "app.tsx", lang: "tsx", target: "dom" });
```

Reference: `plugins/compiler/src/pipeline.mjs transform` and `plugins/compiler/tests/transform.test.ts` and `plugins/compiler/AGENTS.md`


## 4. Direct use vs wrappers

### 4.1 A direct caller owns the whole wrapper contract: filter, target, null, map

**Impact: MEDIUM** - missing one leg of the contract double-processes dependencies, drops maps, or compiles the wrong currency

Calling `transform` directly means inheriting everything the wrappers otherwise handle, as one unit: (1) filter to js/jsx/ts/tsx and skip anything under node_modules, or every dependency pays the pipeline; (2) resolve the target per environment (server `ast`, client `dom`); (3) pass JSX-free null returns through to the host instead of erroring; (4) forward `result.map` verbatim. Each leg is one line in isolation; a direct integration missing any one of them degrades silently.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";

// No filter (dependencies compiled too), no null handling (plain modules
// crash the destructuring), map dropped.
export function load(id: string) {
  const { code, map } = transform(read(id), { filename: id, target: "dom" });
  return { code, map };
}
```

**Correct (what is right):**

```ts
import { transform } from "hellajs-compiler";

const langOf = (id: string) =>
  id.endsWith(".tsx") ? "tsx" : id.endsWith(".ts") ? "ts" : id.endsWith(".jsx") ? "jsx" : "js";

export function load(id: string, server: boolean) {
  if (!/\.(js|jsx|ts|tsx)$/.test(id) || id.includes("node_modules")) return null;
  const result = transform(read(id), {
    filename: id,
    lang: langOf(id),
    target: server ? "ast" : "dom",
  });
  return result ? { code: result.code, map: result.map } : null;
}
```

Reference: `plugins/vite/index.mjs` and `plugins/rollup/index.mjs` and `plugins/compiler/index.d.ts transform`

### 4.2 Consume the bundler wrappers for app builds, the engine only for custom pipelines

**Impact: MEDIUM** - re-implementing the wrapper duplicates extension filtering, node_modules skipping, and per-environment target resolution, and the copy drifts

If the goal is "compile my app's JSX", the wrappers already own the integration: `vite-plugin-hellajs` filters to js/jsx/ts/tsx, skips node_modules, resolves the target per build environment, and passes JSX-free files through to Vite's native pass; `rollup-plugin-hellajs` does the same for Rollup with jsx/tsx resolution and load handling; `astro-plugin-hellajs` wires the renderer pair (server `ssr`, client `hydrate`). Direct `transform` calls are for pipelines the wrappers do not cover: custom bundlers, codemods, codegen CLIs. Do not fork a wrapper's behavior into your own plugin to chase one option; a missing wrapper option is a feature request, not a reason to hand-roll the host integration.

**Incorrect (what is wrong):**

```ts
import { transform } from "hellajs-compiler";
import type { Plugin } from "vite";

// A hand-rolled Vite plugin re-doing vite-plugin-hellajs: hard-coded
// target (broken for SSR), no node_modules skip, no per-env resolution.
export function myHella(): Plugin {
  return {
    name: "my-hella",
    transform(code, id) {
      const result = transform(code, { filename: id, target: "dom" });
      return result ? { code: result.code, map: result.map } : null;
    },
  };
}
```

**Correct (what is right):**

```ts
import { defineConfig } from "vite";
import hellajs from "vite-plugin-hellajs";

export default defineConfig({
  plugins: [hellajs()],
});
```

Reference: `plugins/vite/index.mjs` and `plugins/rollup/index.mjs` and `plugins/astro`


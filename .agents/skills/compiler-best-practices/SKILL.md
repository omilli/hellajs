---
name: compiler-best-practices
description: >
  Best practices for hellajs-compiler, the build-time JSX engine behind HellaJS: transform, TransformOptions, TransformResult. Use when calling the engine directly - custom bundler integrations or codegen over transform(code, options), picking the dom target (imperative @hellajs/dom/runtime construction) vs the ast target (HellaNode for @hellajs/ssr) per build environment, handling the null JSX-free return, forwarding the already-chained sourcemap, or reasoning about the pipeline (oxc TS strip that never typechecks, estree parse, astring print). Covers the misuse surfaces: dom-target output handed to the server stringifier, dropped or hand-rebuilt maps, byte-pinned output assertions, re-implementing what the vite and rollup wrappers already own. Use ONLY for direct hellajs-compiler engine use - Vite/Rollup app configuration belongs to vite-best-practices and rollup-best-practices, the Astro renderer to astro-best-practices, runtime rendering to dom-best-practices, HTML stringification to ssr-best-practices.
---

# compiler-best-practices

Grounded rules for `hellajs-compiler`: the dual-target JSX engine (`transform(code, options)`) behind the vite, rollup, and astro wrappers. One pipeline, two emission currencies: `target: "dom"` (the default) lowers JSX to imperative `@hellajs/dom/runtime` construction (hoisted `template()` html, `mark()`ed build fns), `target: "ast"` emits HellaNode objects, the currency `@hellajs/ssr` stringifies. The pipeline is an oxc-transform TS strip with `jsx: "preserve"`, an acorn + acorn-jsx estree parse, a total-replacement walker, an astring print, and a chained sourcemap. Every rule is derived from the plugin source and its test suite; each rule file cites the symbols and tests that pin it.

## When to Apply

- Any build tooling importing `hellajs-compiler` or calling `transform(`.
- Custom bundler, plugin, or codegen pipelines over the engine (non-Vite, non-Rollup hosts).
- Choosing the target per build environment (server `ast`, client `dom`) and wiring sourcemaps.
- Writing integration tests that assert on compiler output.

Not for: Vite app configuration (`vite-best-practices`), Rollup app builds (`rollup-best-practices`), the Astro renderer (`astro-best-practices`), runtime rendering and hydration (`dom-best-practices`), HTML stringification (`ssr-best-practices`).

## Impact levels

| Level | Meaning |
|---|---|
| CRITICAL | Breaks correctness: lost reactivity, leaks, glitching, hydration mismatch, data loss |
| HIGH | Measurable perf or UX degradation the library exists to prevent |
| MEDIUM | Suboptimal: works but fights the library's model |
| LOW | Convention or consistency |

## Categories

| Prefix | Category | Impact |
|---|---|---|
| target | Target selection | CRITICAL |
| xform | Calling transform | MEDIUM |
| pipe | Pipeline contract | HIGH |
| wrap | Direct use vs wrappers | MEDIUM |

## Rules

### Target selection (target)

- `target-pick-by-environment` - Pick the target by build environment: ast for the server, dom for the client
- `target-explicit-at-every-call-site` - Pass an explicit target at every call site, never the dom default

### Calling transform (xform)

- `xform-lang-explicit-when-extension-lies` - Pass lang explicitly when the module id is not a real filename
- `xform-null-means-no-jsx` - Handle the null return: JSX-free input is a pass-through, not an error
- `xform-options-validate-early` - Treat options as validated config: exact keys, eager probe, no catch-and-continue

### Pipeline contract (pipe)

- `pipe-consume-returned-sourcemap` - Consume the returned sourcemap as-is: it is already chained
- `pipe-output-not-byte-stable` - Assert compiler output structurally, never byte-for-byte
- `pipe-strip-is-not-typecheck` - The TS stage strips types, it never typechecks

### Direct use vs wrappers (wrap)

- `wrap-direct-use-owns-the-contract` - A direct caller owns the whole wrapper contract: filter, target, null, map
- `wrap-prefer-bundler-plugins` - Consume the bundler wrappers for app builds, the engine only for custom pipelines

Full rule text, incorrect/correct examples, and source references: `AGENTS.md` in this folder (compiled from `rules/` by `vp run skills-build`).

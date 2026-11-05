---
name: rollup-best-practices
description: >
  Best practices for rollup-plugin-hellajs, the Rollup wrapper around the HellaJS JSX engine: rollupHellaJS, RollupHellaJSOptions, target. Use when wiring HellaJS into a Rollup build - importing the rollupHellaJS() default export into rollup.config, ordering it ahead of consuming plugins (enforce is inert in Rollup; the array is the ordering control), the target option (dom - imperative @hellajs/dom/runtime construction - defaults in every build, no per-environment resolution; pass "ast" when the bundle feeds @hellajs/ssr server-side), one JSX pipeline (@rollup/plugin-typescript with jsx preserve is the canonical companion). Misuse surfaces: named imports, an uncalled factory, placement after minifiers, nonexistent include/exclude options, a caught construction throw. Use ONLY for Rollup host wiring - engine calls belong to compiler-best-practices, Vite hosts to vite-best-practices, the Astro renderer to astro-best-practices, runtime rendering to dom-best-practices, stringification to ssr-best-practices.
---

# rollup-best-practices

Grounded rules for `rollup-plugin-hellajs`: the thin Rollup wrapper around `hellajs-compiler`. One default export, `rollupHellaJS(options?)`; the only option is `target`, and its default is `"dom"` - imperative `@hellajs/dom/runtime` construction - in EVERY build: Rollup is a client-bundle tool, so unlike the Vite wrapper there is no per-environment resolution; a bundle that runs server-side and feeds `@hellajs/ssr` pins `{ target: "ast" }` explicitly. The plugin compiles `.js`/`.ts`/`.jsx`/`.tsx` files outside `node_modules` through `resolveId`, `load`, and `transform` hooks and returns `null` for JSX-free files so Rollup's native pass still handles them. The plugin object carries `enforce: "pre"` - a Vite field; under plain Rollup the position in the plugins array is the ordering control. Every rule is derived from the wrapper source, its target-option test suite, and the bench example config; each rule file cites the symbols and files that pin it.

## When to Apply

- Any `rollup.config` importing `rollup-plugin-hellajs` or calling `rollupHellaJS(`.
- Ordering the wrapper among `@rollup/plugin-typescript`, `@rollup/plugin-node-resolve`, and minifier plugins.
- Server-side Rollup bundles whose output feeds `@hellajs/ssr` (the `"ast"` pin).
- Deciding whether a second JSX transform or `include`/`exclude`-style plugin options belong in the config (they do not).

Not for: direct `hellajs-compiler` engine use (`compiler-best-practices`), Vite hosts (`vite-best-practices`), the Astro renderer (`astro-best-practices`), runtime rendering (`dom-best-practices`), HTML stringification (`ssr-best-practices`).

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
| cfg | Registration and ordering | CRITICAL |
| opt | Options surface | CRITICAL |
| bound | Boundaries | MEDIUM |

## Rules

### Registration and ordering (cfg)

- `cfg-register-default-export` - Register rollupHellaJS() once, in the plugins array, as a called default import
- `cfg-order-transforms-before-consumers` - Order rollupHellaJS() ahead of plugins that consume compiled output

### Options surface (opt)

- `opt-target-omit-unless-server` - Omit target for client bundles, pin ast only for a server target
- `opt-surface-is-target-only` - Pass only target - every other key is silently ignored
- `opt-invalid-target-throws-at-construction` - Read a construction-time throw as a target error, never catch past it

### Boundaries (bound)

- `bound-single-jsx-transform` - Keep one JSX pipeline - rollupHellaJS() owns JSX lowering
- `bound-transform-semantics-are-compiler-owned` - Engine questions are compiler-best-practices ground; the wrapper only wires them

Full rule text, incorrect/correct examples, and source references: `AGENTS.md` in this folder (compiled from `rules/` by `vp run skills-build`).

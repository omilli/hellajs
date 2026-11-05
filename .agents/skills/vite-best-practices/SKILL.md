---
name: vite-best-practices
description: >
  Best practices for vite-plugin-hellajs, the Vite wrapper around the HellaJS JSX engine: viteHellaJS, ViteHellaJSOptions, target. Use when wiring HellaJS into a Vite app - registering viteHellaJS() in vite.config (default import, root plugins array), deciding whether the target option applies (unset it resolves per environment: server builds emit ast HellaNode for @hellajs/ssr, client builds emit dom @hellajs/dom/runtime construction; an explicit target wins verbatim in both pipelines), installing @hellajs/* packages as dependencies with no aliasing, and keeping a single JSX pipeline. Covers the misuse surfaces: pinning target "dom" in an SSR app, registering under build.rollupOptions.plugins, pairing @vitejs/plugin-react, deep-path imports. Use ONLY for Vite host wiring - direct hellajs-compiler engine calls belong to compiler-best-practices, Rollup builds to rollup-best-practices, the Astro renderer to astro-best-practices, runtime rendering to dom-best-practices, HTML stringification to ssr-best-practices.
---

# vite-best-practices

Grounded rules for `vite-plugin-hellajs`: the thin Vite wrapper around `hellajs-compiler`. One default export, `viteHellaJS(options?)`; the only option is `target`, and unset it resolves per build environment - server builds emit `ast` (HellaNode objects, `@hellajs/ssr`'s currency), client builds emit `dom` (imperative `@hellajs/dom/runtime` construction). The plugin runs `enforce: "pre"`, transforms `.js`/`.ts`/`.jsx`/`.tsx` files outside `node_modules`, and returns `null` for JSX-free files so Vite's native esbuild pass still strips TS. Every rule is derived from the wrapper source and the example configs; each rule file cites the symbols and files that pin it.

## When to Apply

- Any `vite.config` importing `vite-plugin-hellajs` or calling `viteHellaJS(`.
- Installing HellaJS into a Vite app: which packages to declare and how compiled JSX modules resolve.
- SSR-in-Vite setups where the server and client pipelines need different emission targets.
- Deciding whether a second JSX plugin or a hand-rolled transform hook belongs in the config (it does not).

Not for: direct `hellajs-compiler` engine use (`compiler-best-practices`), Rollup builds (`rollup-best-practices`), the Astro renderer (`astro-best-practices`), runtime rendering (`dom-best-practices`), HTML stringification (`ssr-best-practices`).

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
| cfg | Registration and options | CRITICAL |
| res | Module resolution | HIGH |
| bound | Boundaries | MEDIUM |

## Rules

### Registration and options (cfg)

- `cfg-register-default-export` - Register viteHellaJS() once, in the root plugins array, as a default import
- `cfg-target-omit-unless-pinning` - Omit target unless one currency is wanted in every environment
- `cfg-invalid-options-throw-at-construction` - Read a construction-time throw as an options error, never catch past it

### Module resolution (res)

- `res-bare-specifiers-no-alias` - Import vite-plugin-hellajs and @hellajs/* as bare specifiers, no aliasing
- `res-declare-runtime-packages` - Declare every @hellajs/* package the app compiles against

### Boundaries (bound)

- `bound-single-jsx-transform` - Keep one JSX pipeline: no second JSX plugin beside viteHellaJS()
- `bound-transform-semantics-are-compiler-owned` - Engine questions are compiler-best-practices ground; the wrapper only wires them

Full rule text, incorrect/correct examples, and source references: `AGENTS.md` in this folder (compiled from `rules/` by `vp run skills-build`).

---
name: astro-best-practices
description: Best practices for astro-plugin-hellajs, the Astro 7 integration for HellaJS: hellajs() default export, renderToStaticMarkup, hydrate. Use when configuring an Astro project with HellaJS islands - registering the integration in astro.config.mjs (exclusive-use, no options surface), pairing components with client:* directives (client:only carries the renderer name), consuming Astro slots as props.children raw HTML, folding css()/style()/keyframes() frontmatter calls (cssText() opt-out, vars() sheet flushes), and resolving @hellajs/headless server-side through the ssr export condition the integration adds - never ssr.noExternal or aliases. Use ONLY for astro-plugin-hellajs and Astro + HellaJS integration usage - HTML stringification internals belong to ssr-best-practices, transform internals to compiler-best-practices, runtime rendering and hydration to dom-best-practices, Vite app config to vite-best-practices, styling APIs to css-best-practices.
---

# astro-best-practices

Grounded rules for `astro-plugin-hellajs`: the Astro 7 integration that renders `.jsx`/`.tsx` HellaJS components server-side via `@hellajs/ssr` and hydrates them behind `client:*` directives. `hellajs()` wires four pieces at once - the HellaJS vite plugin (JSX transform), frontmatter `css()`/`style()`/`keyframes()` extraction into page-scoped CSS, the `ssr` export condition on the server environments (JSX-bearing `@hellajs/*` packages resolve their server-safe dist arm zero-config), and the framework renderer pair (server `renderToStaticMarkup` -> `ssr()`, client `hydrate`). Exclusive-use by contract: HellaJS is the project's only JSX framework. Every rule is derived from the plugin source and its test suite; each rule file cites the symbols and tests that pin it.

## When to Apply

- Any `astro.config.mjs` importing `astro-plugin-hellajs`, or any Astro 7 project using HellaJS islands.
- Using `client:*` directives, Astro slots, or frontmatter styles with HellaJS components.
- Server-build failures around `@hellajs/*` resolution in Astro (`document is not defined` from a `template()` call).

Not for: HTML stringification internals (`ssr-best-practices`), compiler transform internals (`compiler-best-practices`), runtime rendering and hydration (`dom-best-practices`), Vite app config (`vite-best-practices`), the css package's own APIs (`css-best-practices`).

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
| cfg | Registration and exclusivity | CRITICAL |
| render | Islands and hydration | CRITICAL |
| slot | Slot passthrough | HIGH |
| style | Frontmatter styles | HIGH |
| res | Server resolution | CRITICAL |

## Rules

### Registration and exclusivity (cfg)

- `cfg-register-default-integration` - Register hellajs() once, in the integrations array, as a default import
- `cfg-exclusive-jsx-framework` - Treat the integration as exclusive-use: HellaJS is the only JSX framework
- `cfg-integration-takes-no-options` - Call hellajs() with no arguments - the integration has no options surface

### Islands and hydration (render)

- `render-hydrate-behind-client-directive` - Give every interactive island a client:* directive - no directive means static HTML
- `render-client-only-carries-renderer-name` - client:only islands carry the renderer name - client:only="astro-hellajs"
- `render-island-bodies-run-server-side` - Island bodies execute during the server render - keep browser APIs out of the render path

### Slot passthrough (slot)

- `slot-consume-children-named-props` - Consume slots as props.children and props.<name> - they arrive as rendered HTML
- `slot-html-is-trusted-never-user-input` - Slot HTML is trusted by construction - never route unsanitized user input through a slot

### Frontmatter styles (style)

- `style-frontmatter-calls-fold-statically` - Keep frontmatter creator calls statically evaluable - fold at build or fail the build
- `style-csstext-reference-is-the-opt-out` - Opt out of style extraction deliberately - import and reference cssText
- `style-vars-sheets-need-a-csstext-flush` - vars() sheets deliver only through a cssText() flush - extraction discards the registration

### Server resolution (res)

- `res-ssr-condition-is-conditions-not-noexternal` - Fix server resolution with the ssr condition the integration already adds - never noExternal or aliases
- `res-headless-imports-are-server-safe` - Import @hellajs/headless directly in islands - the server arm renders it safely

Full rule text, incorrect/correct examples, and source references: `AGENTS.md` in this folder (compiled from `rules/` by `vp run skills-build`).

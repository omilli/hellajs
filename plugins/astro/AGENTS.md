<astro-plugin>

Astro 7 framework-renderer integration (`astro-plugin-hellajs`). Wires `vite-plugin-hellajs` (JSX + `html\`\`` → HellaNode) and registers a renderer so `.jsx`/`.tsx` components render server-side via `@hellajs/ssr` and hydrate client-side behind `client:*`. Entry point: `index.mjs` — `hellajs()` returns an `AstroIntegration` whose `astro:config:setup` hook calls `updateConfig({ vite: { plugins } })` + `addRenderer({ name, clientEntrypoint, serverEntrypoint })`. **No config options**; signature takes no parameters.

## Mental model

- **Two entrypoints beyond the integration** — `server.mjs` (SSR: `renderToStaticMarkup`) and `client.mjs` (island hydration). Both resolve entrypaths via `fileURLToPath(new URL("./{server,client}.mjs", import.meta.url))` in `index.mjs` so they survive packaging.
- **The renderer is a thin adapter.** `renderToStaticMarkup(Component, props, slots)` maps slots → `raw()`, runs `Component(props)` (returns a HellaNode; nested `component()` calls execute server-side with no DOM — `memory/entries/005.md`), and stringifies via `ssr()`. All heavy lifting is existing dom/ssr behavior; `raw()` (`packages/dom/lib/raw.ts`, Unit A) is the only new primitive consumed.
- **Slot passthrough is the load-bearing feature.** Astro passes `slots: Record<name, htmlString>` (already-rendered HTML of the `.astro` slot children). `mapSlots` wraps each as `[raw(html)]` — array-wrapped so a JSX `<X>{props.children}</X>` (compiled to `...props.children` by the babel plugin, `plugins/babel/src/processors/children.mjs`) spreads the sentinel, not the object's keys. `default` → `props.children`; named → `props[name]`. Server and client entries apply the identical mapping.

## Files

| File | Responsibility |
|---|---|
| `index.mjs` | Integration entry; `astro:config:setup` → `updateConfig` (Vite plugin) + `addRenderer` (entrypoints). |
| `server.mjs` | Renderer server entry; default-exports `{ check, renderToStaticMarkup }` + the shared `mapSlots`. |
| `client.mjs` | Renderer client entry; default-exports `(el) => (Component, props, slots) => hydrate(...)`. |
| `index.d.ts` | Hand-written minimal `AstroIntegration` types (no `astro` import — typechecks without `astro` installed). |
| `tests/renderToStaticMarkup.test.ts` | Server-entry scenarios (the pure `renderToStaticMarkup` adapter). |

## Astro 7 renderer contract (grounded from installed source — verify on major-version bumps)

- **Renderer registration** — `addRenderer({ name, clientEntrypoint, serverEntrypoint })` (`AstroRenderer`, `astro/dist/types/public/integrations.d.ts`).
- **Server entry** default-exports `{ check, renderToStaticMarkup }` (`SSRLoadedRendererValue`, `astro/dist/types/public/internal.d.ts`): `renderToStaticMarkup(Component, props, slots: Record<string, string>, metadata?) => Promise<{ html }>`. Astro calls it at `astro/dist/runtime/server/render/component.js`.
- **Client entry** default export is a curried factory — `this.hydrator(this)(Component, props, slots, { client })` (`astro/dist/runtime/server/astro-island.prebuilt.js`). So: `default(el) => (Component, props, slots, { client }) => void`.
- **Markers survive deferred islands** — Astro keeps SSR HTML directly in the `<astro-island>` element; `client:visible`/`idle`/`media` only delay the hydrator call, they do not serialize innerHTML into a comment-stripping `<template>`. So all `client:*` directives hydrate correctly.

## Non-obvious behaviors

- **Exclusive use.** `vite-plugin-hellajs` transforms all `.jsx`/`.tsx`/`.js`/`.ts` (excluding `node_modules`). No scoping logic is added here — mixing another JSX framework is unsupported and will mangle it.
- **`check` claims every function component** — `typeof Component === "function"`. With mixed frameworks this over-claims; exclusive use is the contract.
- **Server calls `Component(props)` raw, not `component(Component, props)`.** The root default export is the user's fn; nested `<Child/>` already compile to `component(Child, props)` internally and execute server-side. Wrapping the root in `component()` is unnecessary server-side (`ssr` ignores `componentScope`) and is reserved for the client entry where reactive scope matters.
- **Client entry wraps the root in `component()`** — `hydrate(() => component(Component, props), el)` — to re-establish reactive scope + disposal on hydrate.
- **`raw()` is XSS-relevant.** Slot HTML bypasses escaping (it's the foreign renderer's already-rendered output, trusted). Never feed unsanitized user input through a slot.

## Testing approach (`tests/`)

- **Plugin carveout** — tests import from source (`../server.mjs`), NOT `dist/`. Run via `bun test plugins/astro/tests` + `bun lint` (NOT `bun coverage astro` — `isValidPackage` resolves under `packages/` only; per root `AGENTS.md` plugin exception, mirroring `plugins/babel`).
- **Server entry is unit-tested directly** — it's a pure `(Component, props, slots) → { html }` over already-transformed source; testable without an Astro build, HappyDOM-only. Asserts verbatim slot passthrough (full marker-wrapped strings), named-slot mapping, `check`, and reactive-state SSR.
- **Client entry is NOT unit-tested here** — `hydrate()` needs a live DOM + server HTML and is exercised by the docs example / a manual smoke test. Its behavior (marker adoption) is covered by `packages/dom/tests/` (incl. `raw.test.ts` from Unit A).

# astro-best-practices

Compiled by `vp run skills-build` from `rules/` - never hand-edit; regenerate instead.

Best practices for astro-plugin-hellajs, the Astro 7 integration for HellaJS: registering hellajs() in the integrations array (exclusive-use, no options), island hydration behind client:* directives (client:only carries the renderer name), Astro slots consumed as props.children raw HTML, statically foldable css()/style()/keyframes() frontmatter calls with the cssText() opt-out and vars() sheet flushes, and server resolution of JSX-bearing @hellajs/* packages through the ssr export condition the integration adds - never ssr.noExternal or aliases. Every rule is grounded in the plugin source and test suite.

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
- 1. Registration and exclusivity
  - 1.1 Treat the integration as exclusive-use: HellaJS is the only JSX framework (`cfg-exclusive-jsx-framework`)
  - 1.2 Call hellajs() with no arguments - the integration has no options surface (`cfg-integration-takes-no-options`)
  - 1.3 Register hellajs() once, in the integrations array, as a default import (`cfg-register-default-integration`)
- 2. Islands and hydration
  - 2.1 client:only islands carry the renderer name - client:only="astro-hellajs" (`render-client-only-carries-renderer-name`)
  - 2.2 Give every interactive island a client:* directive - no directive means static HTML (`render-hydrate-behind-client-directive`)
  - 2.3 Island bodies execute during the server render - keep browser APIs out of the render path (`render-island-bodies-run-server-side`)
- 3. Slot passthrough
  - 3.1 Consume slots as props.children and props.<name> - they arrive as rendered HTML (`slot-consume-children-named-props`)
  - 3.2 Slot HTML is trusted by construction - never route unsanitized user input through a slot (`slot-html-is-trusted-never-user-input`)
- 4. Frontmatter styles
  - 4.1 Opt out of style extraction deliberately - import and reference cssText (`style-csstext-reference-is-the-opt-out`)
  - 4.2 Keep frontmatter creator calls statically evaluable - fold at build or fail the build (`style-frontmatter-calls-fold-statically`)
  - 4.3 vars() sheets deliver only through a cssText() flush - extraction discards the registration (`style-vars-sheets-need-a-csstext-flush`)
- 5. Server resolution
  - 5.1 Import @hellajs/headless directly in islands - the server arm renders it safely (`res-headless-imports-are-server-safe`)
  - 5.2 Fix server resolution with the ssr condition the integration already adds - never noExternal or aliases (`res-ssr-condition-is-conditions-not-noexternal`)

## 1. Registration and exclusivity

### 1.1 Treat the integration as exclusive-use: HellaJS is the only JSX framework

**Impact: CRITICAL** - the transform rewrites every JSX file and the renderer claims every function component, so a second framework's JSX is mangled and over-claimed

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

### 1.2 Call hellajs() with no arguments - the integration has no options surface

**Impact: LOW** - invented options are silently ignored, so config that appears to work is coincidence and the real levers do not exist

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

### 1.3 Register hellajs() once, in the integrations array, as a default import

**Impact: CRITICAL** - hand-wiring the vite plugin registers no renderer: pages cannot use HellaJS components, islands never hydrate, and the server resolves the dom arm

Register the integration's default export once in `astro.config.mjs`: `import hellajs from "astro-plugin-hellajs"` and `integrations: [hellajs()]`. The package's exports map exposes only the root, carrying a single default export - there is no named export to destructure and no second entry to wire. One registration installs all four pieces: the HellaJS vite plugin (JSX transform), the frontmatter `css()`/`style()`/`keyframes()` extraction, the `ssr` export condition on the server environments, and the framework renderer (server `renderToStaticMarkup` -> `@hellajs/ssr`, client `hydrate`). Hand-registering `vite-plugin-hellajs` under `vite.plugins` instead transforms JSX but registers no renderer: `.astro` pages cannot render the components, no island hydrates, and JSX-bearing `@hellajs/*` packages resolve the dom arm on the server.

**Incorrect (what is wrong):**

```ts
import { defineConfig } from "astro/config";
import viteHellaJS from "vite-plugin-hellajs";

export default defineConfig({
  // hand-wired vite plugin: no renderer, no frontmatter extraction,
  // no ssr conditions - islands cannot hydrate
  vite: { plugins: [viteHellaJS()] },
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

Reference: `plugins/astro/index.mjs hellajs` and `plugins/astro/package.json` and `examples/astro-islands/astro.config.mjs`


## 2. Islands and hydration

### 2.1 client:only islands carry the renderer name - client:only="astro-hellajs"

**Impact: MEDIUM** - Astro skips framework detection for client-only components, so the directive must name the renderer explicitly

Astro skips server-side framework detection for `client:only` components and needs the renderer identified explicitly: `client:only="astro-hellajs"` (the name the integration registers its renderer under). Reach for `client:only` only when the component cannot execute during the server render - browser-only APIs at module scope, for instance - because it trades away the server HTML: the island renders fresh on the client and flashes in late instead of hydrating markup that is already on the page. Everything else SSRs by default and hydrates in place behind `client:load` and friends.

**Incorrect (what is wrong):**

```tsx
import type { HellaNode } from "@hellajs/dom";

// module scope touches a browser API: this component cannot run during the
// server render - and a bare client:only leaves the renderer unidentified
declare const window: Window;
const initialWidth = window.innerWidth;

export default function Width(): HellaNode {
  return <span>{String(initialWidth)}</span>;
}
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import type { HellaNode } from "@hellajs/dom";

// browser state read at interaction time (a hydrated-client-only event),
// used from the page as <Width client:only="astro-hellajs" />
export default function Width(): HellaNode {
  const width = signal(0);
  return <button on:click={() => width(window.innerWidth)}>{width()}</button>;
}
```

Reference: `plugins/astro/index.mjs addRenderer` and `plugins/astro/README.md` and `examples/astro-islands/src/pages/index.astro`

### 2.2 Give every interactive island a client:* directive - no directive means static HTML

**Impact: CRITICAL** - a directive-less component renders once server-side and ships as static HTML: its handlers never attach and its signals live for exactly one render

A HellaJS component used in a `.astro` page always renders server-side (`renderToStaticMarkup` runs `Component(props)` and stringifies via `@hellajs/ssr`, `<!--[-->…<!--]-->` markers intact). Hydration happens only behind Astro's `client:*` directives: `client:load`, `client:idle`, `client:visible`, `client:media`, `client:only`. Without a directive the component's server HTML ships and nothing more - the click handler never attaches. All directives hydrate identically (the markers survive every directive's deferred island serialization); pick by eagerness, not by capability. Use a directive on every component whose interactivity matters; leave it off only for genuinely static output.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";

// island code cannot hydrate itself: without a client:* directive on the
// element in the .astro page, this renders once as inert HTML
export default function Counter({ initial = 0 }: { initial?: number }) {
  const count = signal(initial);
  return <button on:click={() => count(count() + 1)}>{count()}</button>;
}
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import type { HellaNode } from "@hellajs/dom";

// the island component - identical under client:load / idle / visible / media
export default function Counter({ initial = 0 }: { initial?: number }): HellaNode {
  const count = signal(initial);
  return <button on:click={() => count(count() + 1)}>{count()}</button>;
}
```

Used as `<Counter client:load initial={0} />` in the `.astro` page.

Reference: `plugins/astro/client.mjs` and `plugins/astro/server.mjs renderToStaticMarkup` and `examples/astro-islands/src/pages/index.astro`

### 2.3 Island bodies execute during the server render - keep browser APIs out of the render path

**Impact: HIGH** - module-scope or render-body browser API access throws during prerender (the server build has no DOM), breaking astro build

The renderer's server entry calls `Component(props)` directly and stringifies the returned tree; nested component calls execute server-side too, with no DOM - the server arm compiles at the ast target (HellaNode trees for `@hellajs/ssr`, no imperative dom-runtime construction). So the function body of every server-rendered island runs at build or prerender time, and its module scope runs when the module loads: `window`/`document` access at either point throws during `astro build`. Browser-only logic belongs in event handlers (which only ever fire in the hydrated client) or behind `client:only` (which skips server execution entirely). Reading reactive state is safe - the server renders its current value.

**Incorrect (what is wrong):**

```tsx
import { signal } from "@hellajs/core";

// module scope runs during the server render: throws - no window there
const initialWidth = window.innerWidth;
const width = signal(initialWidth);

export default function Width() {
  return <span>{width()}</span>;
}
```

**Correct (what is right):**

```tsx
import { signal } from "@hellajs/core";
import type { HellaNode } from "@hellajs/dom";

// browser state read at interaction time, not render time
export default function Width(): HellaNode {
  const width = signal(0);
  return <button on:click={() => width(window.innerWidth)}>{width()}</button>;
}
```

Reference: `plugins/astro/server.mjs renderToStaticMarkup` and `plugins/astro/tests/renderToStaticMarkup.test.ts` and `plugins/astro/AGENTS.md`


## 3. Slot passthrough

### 3.1 Consume slots as props.children and props.<name> - they arrive as rendered HTML

**Impact: HIGH** - fighting the mapped shape (calling it as a function, joining it, expecting a string) throws or double-escapes the pre-rendered slot HTML

Astro hands the renderer pre-rendered slot HTML (`slots: Record<name, htmlString>`); the integration maps each entry to a `[raw(html)]` child array - the default slot onto `props.children`, named slots onto `props[name]`. The server and client entries apply the identical mapping, so the server output and the hydrated client see the same shape (valid through any children shape the component template consumes). Consume the prop directly in JSX - `<main>{props.children}</main>`, `<header>{props.header}</header>` - and do not adapt it: it is not a function to call, not a string to join or interpolate, and not a slot-renderer API from another framework.

**Incorrect (what is wrong):**

```tsx
import type { ComponentFn } from "@hellajs/dom";

// slots are not functions: the mapped value is a child array carrying
// pre-rendered HTML - calling it throws during the server render
const Card: ComponentFn = (props) => {
  const children = props.children as () => unknown;
  return <main>{children()}</main>;
};
```

**Correct (what is right):**

```tsx
import type { ComponentFn, HellaNode } from "@hellajs/dom";

// default slot -> props.children, named slots -> props[name]:
// render the child arrays as-is
const Card: ComponentFn = (props) => (
  <main>
    <header>{props.header as HellaNode[]}</header>
    {props.children as HellaNode[]}
  </main>
);
```

Used as `<Card><h1>Hi</h1><p slot="header">Title</p></Card>` in the `.astro` page.

Reference: `plugins/astro/server.mjs mapSlots` and `plugins/astro/client.mjs` and `plugins/astro/tests/renderToStaticMarkup.test.ts`

### 3.2 Slot HTML is trusted by construction - never route unsanitized user input through a slot

**Impact: CRITICAL** - slot content reaches the DOM through raw() with no escaping, so user-influenced slot content is script injection (XSS)

Astro slot children reach the component as `[raw(html)]` - `raw()` marks the string as pre-rendered HTML and it is emitted verbatim, no escaping, server and client alike. That is correct for what slots are: Astro's own already-rendered output, trusted by construction. It is an XSS hole for anything user-influenced: request data interpolated into slot content (or into `set:html` handoffs) reaches the page unescaped. Keep slots for authored/trusted markup; render user text as a regular component child (text children escape normally), or sanitize with a policy-based sanitizer before the string enters a slot. The general `raw()` contract (nothing inside the boundary is reactive or hydrated) is `dom-best-practices`' raw rule.

**Incorrect (what is wrong):**

```tsx
import { raw } from "@hellajs/dom";
import type { ComponentFn } from "@hellajs/dom";

// comment.body is user input: routing it through raw() ships a script
// tag to the client verbatim
const Comment: ComponentFn = (props) => (
  <p>{[raw(String(props.body))]}</p>
);
```

**Correct (what is right):**

```tsx
import type { ComponentFn } from "@hellajs/dom";

// text children escape: user input renders as inert text
const Comment: ComponentFn = (props) => <p>{String(props.body)}</p>;
```

Reference: `plugins/astro/server.mjs mapSlots` and `packages/dom/lib/raw.ts raw` and `packages/dom/docs/api/raw.mdx`


## 4. Frontmatter styles

### 4.1 Opt out of style extraction deliberately - import and reference cssText

**Impact: MEDIUM** - dynamic styles left in page frontmatter either fail the fold or freeze at their build-time value under a prerendered page

A page that imports AND references `cssText` is left byte-identical: extraction skips the whole module and manual management applies. That reference is the escape hatch for dynamic styles - creation moves out of the page into a module (where values can be computed at runtime), the module collects its rules with `cssText()`, and the page inlines the result once in its head. Keep the creation out of page frontmatter even when opted out: a statically prerendered page runs its frontmatter once at build, so a "dynamic" style there freezes at its build-time value. `client:only` islands importing the same theme module register their rules themselves when they load; content-hashed class names match on both sides.

**Incorrect (what is wrong):**

```astro
---
import { cssText, style } from "@hellajs/css";
import { mode } from "../mode";

// dynamic creation left in the page: the cssText reference opts the page
// out of extraction, and the prerendered frontmatter runs once at build -
// the style freezes at whatever mode() returned then
const hero = style({ color: mode() === "dark" ? "#ffffff" : "#111111" });
---
<style is:inline set:html={cssText()} />
```

**Correct (what is right):**

```astro
---
// creation lives in the module; the page only flushes
import { styles } from "../theme";
---
<head>
  <style is:inline set:html={styles} />
</head>
```

```ts
// src/theme.ts - create and collect in a module the page imports
import { cssText, style } from "@hellajs/css";

export const hero = style({ color: "#111111" }, { label: "hero" });
export const styles = cssText();
```

Reference: `plugins/astro/frontmatter.mjs transform` and `plugins/astro/tests/frontmatter.test.ts` and `plugins/astro/README.md`

### 4.2 Keep frontmatter creator calls statically evaluable - fold at build or fail the build

**Impact: HIGH** - a non-foldable css()/style()/keyframes() argument in page frontmatter fails the build, and vars() in a page throws - the escape hatch is a module plus cssText()

`css()`, `style()`, and `keyframes()` calls in `.astro` frontmatter fold at build: arguments must be literals, objects, arrays, template literals, same-module `const` bindings, or imported bindings that resolve recursively through their source module (`cx()` compositions and `cva()` recipes fold to their string results). A creator call with non-foldable arguments in the page's frontmatter fails the build with the escape-hatch message - move the dynamic call into a module and collect with `cssText()`. Two positional rules: `vars()` in a page throws outright (its reactivity is dead server-side), while in imported modules non-foldable creator calls are silently ignored because the island runtime owns them. Import theme modules with extensionless relative specifiers (`../styles/tokens`, not `../styles/tokens.ts`): the extractor probes `.mjs`/`.js`/`.ts`/`.tsx`/`.jsx` extensions off the bare base, so a specifier that already carries an extension never resolves and its bindings stay unset.

**Incorrect (what is wrong):**

```astro
---
import { style } from "@hellajs/css";
import { tokens } from "../styles/tokens";

// computed member access is not statically evaluable: the build fails
// with "frontmatter style() requires statically evaluable arguments"
const hero = style({ color: tokens["foreground"] });
---
<div class={hero}>Hi</div>
```

**Correct (what is right):**

```astro
---
import { style } from "@hellajs/css";
import { tokens } from "../styles/tokens";

// literals, member chains on imported vars() objects, and const bindings fold
const hero = style({ color: tokens.foreground }, { label: "hero" });
---
<div class={hero}>Hi</div>
```

```ts
// src/styles/tokens.ts - imported bindings fold through their source module
import { vars } from "@hellajs/css";

export const tokens = vars({ foreground: "#111111", background: "#fafafa" });
```

Reference: `plugins/astro/evaluate.mjs extractFrontmatter` and `plugins/astro/tests/frontmatter.test.ts` and `plugins/astro/README.md`

### 4.3 vars() sheets deliver only through a cssText() flush - extraction discards the registration

**Impact: HIGH** - folded var(--x) references silently render with no value when nothing flushes the vars sheet into the page

An imported `vars()` runs during extraction so its reference object binds and member chains on it fold - `tokens.foreground` becomes `var(--foreground)` in the folded rule - but the sheet registration itself is discarded: static delivery of the `--foreground: #111111` declarations is the layout's `cssText()` flush, and an extracted copy would only duplicate the sheet per importing module. So a page whose folded rules reference vars, with nothing flushing the sheet, silently ships rules whose every `var(--x)` resolves to nothing. Import the vars module (or a theme module that both defines the vars and exports `cssText()`'s result) in the layout or page and inline the flush once. In a page's own frontmatter `vars()` throws outright instead.

**Incorrect (what is wrong):**

```astro
---
import { style } from "@hellajs/css";
import { tokens } from "../styles/tokens";

// the rule folds (tokens.foreground -> var(--foreground)) but the sheet
// registration is discarded - nothing flushes --foreground into the page
const hero = style({ color: tokens.foreground });
---
<div class={hero}>Hi</div>
```

**Correct (what is right):**

```astro
---
import { styles, tokens } from "../styles/sheet";
import { style } from "@hellajs/css";

const hero = style({ color: tokens.foreground }, { label: "hero" });
---
<head>
  <style is:inline set:html={styles} />
</head>
```

```ts
// src/styles/sheet.ts - the vars sheet and its flush travel together
import { cssText, vars } from "@hellajs/css";

export const tokens = vars({ foreground: "#111111" });
export const styles = cssText();
```

Reference: `plugins/astro/evaluate.mjs extractFrontmatter` and `plugins/astro/tests/frontmatter.test.ts` and `plugins/astro/README.md`


## 5. Server resolution

### 5.1 Import @hellajs/headless directly in islands - the server arm renders it safely

**Impact: MEDIUM** - gating server-safe imports behind client:only or dynamic import discards the server HTML the ssr condition exists to provide

The `ssr` condition means island code imports headless components bare and uses them unguarded: the server arm renders the trigger and the closed content gate to HTML, and the client hydrates the same markup through the dom arm. No `import.meta.env.SSR` branching, no dynamic `import()` deferral, no mock - the package resolves the right arm per environment on its own, and island code is identical on both sides. Wrapping headless usage in `client:only` (or lazily importing it after load) trades away exactly what the condition provides: server-rendered markup that hydrates in place instead of flashing in late. Packages without an `ssr` condition resolve their regular entry in every environment, unchanged.

**Incorrect (what is wrong):**

```astro
---
import Settings from '../components/Settings';
---
<!-- client:only skips the server render the ssr arm already supports:
     the island renders fresh on the client instead of hydrating -->
<Settings client:only="astro-hellajs" />
```

**Correct (what is right):**

```tsx
import { popover } from "@hellajs/headless";
import type { HellaNode } from "@hellajs/dom";

const Popover = popover();

export default function Settings(): HellaNode {
  return (
    <div>
      <Popover.Trigger>Settings</Popover.Trigger>
      <Popover.Content side="bottom">Panel content</Popover.Content>
    </div>
  );
}
```

Used as `<Settings client:load />` in the `.astro` page.

Reference: `plugins/astro/index.mjs configEnvironment` and `plugins/astro/README.md` and `packages/headless/lib/popover.tsx popover`

### 5.2 Fix server resolution with the ssr condition the integration already adds - never noExternal or aliases

**Impact: CRITICAL** - ssr.noExternal is a no-op (vite internalizes the packages yet resolves the import arm), aliases fight the exports map, and astro drops user environment conditions - the server build keeps dying at template()

JSX-bearing `@hellajs/*` packages ship two dist arms: the `import` arm (dom-target, `template()` builders at module scope) and an `ssr` arm (ast-compiled, safe to import in bare Node). The integration adds the bundler-only `ssr` condition to Astro's `ssr` and `prerender` environments through a vite `configEnvironment` hook, so the server arm resolves zero-config while client environments keep the dom arm and hydration stays interactive. When the server build dies with `document is not defined` from a `template()` call, the missing condition is the mechanism - and the integration already ships the fix. Do not reach for `vite.ssr.noExternal` (Vite internalizes the packages into the server bundle yet still resolves the `import` arm - a no-op), `resolve.alias` to a dist path (fights the package exports map, breaks client resolution, drifts), or user `environments.*.resolve.conditions` (Astro replaces the `prerender` and `client` environment keys wholesale, silently dropping the config).

**Incorrect (what is wrong):**

```ts
import { defineConfig } from "astro/config";
import hellajs from "astro-plugin-hellajs";

export default defineConfig({
  integrations: [hellajs()],
  vite: {
    ssr: {
      // no-op: vite internalizes the packages but still resolves the
      // import arm - the server build keeps dying at template()
      noExternal: ["@hellajs/headless"],
    },
  },
});
```

**Correct (what is right):**

```ts
import { defineConfig } from "astro/config";
import hellajs from "astro-plugin-hellajs";

// the integration's configEnvironment hook already adds the ssr
// condition to the ssr + prerender environments - nothing to configure
export default defineConfig({
  integrations: [hellajs()],
});
```

Reference: `plugins/astro/index.mjs configEnvironment` and `plugins/astro/README.md`


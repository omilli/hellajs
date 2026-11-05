# ui-best-practices

Compiled by `vp run skills-build` from `rules/` - never hand-edit; regenerate instead.

Best practices for @hellajs/ui, the copy/paste component registry CLI: the init/add/list workflow, hella.ui.json precedence, css vs tailwind style splicing, the split theme artifacts (tokens.ts / theme.css) and dark-default mode, peer installs, --lang js delivery, and the ownership contract - no runtime import surface; the copy is your code. Every rule is grounded in the package source and test suite.

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
- 1. Ownership model
  - 1.1 Customize by editing the copied file; it is your code (`own-edit-the-copy`)
  - 1.2 Never import @hellajs/ui at runtime; run the CLI (`own-no-runtime-import`)
  - 1.3 Update copies by re-running add with overwrite, never by patching node_modules (`own-update-rerun-overwrite`)
- 2. CLI workflow
  - 2.1 hella.ui.json holds per-project defaults; flags override per call (`cli-config-flag-precedence`)
  - 2.2 Run init once before adding components; it owns the theme entry (`cli-init-theme-entry`)
  - 2.3 Reserve --lang js for JS-only toolchains; the output still needs the HellaJS compiler (`cli-lang-js-toolchains`)
  - 2.4 Discover component names with list; names are kebab-case registry slugs (`cli-list-before-guess`)
  - 2.5 Install the peers the add hint names; they never arrive transitively (`cli-peers-install-hint`)
- 3. Style variants
  - 3.1 Consume copies, not canonical source; markers and splice modules are registry internals (`variant-canonical-not-app-source`)
  - 3.2 Override through the class prop; the copy composes it last (`variant-class-prop-overrides`)
  - 3.3 Pick one style - css or tailwind - and copy every component at it (`variant-one-style-per-project`)
- 4. Theming
  - 4.1 Togglable dark mode is the .dark ancestor class (`theme-dark-class-toggle`)
  - 4.2 themeMode dark is the css-only dark-default sheet, not a toggle (`theme-dark-default-css-only`)
  - 4.3 Import the theme artifact once, before any styled component mounts (`theme-import-once-first`)
  - 4.4 Keep the theme artifacts straight - tokens.ts is css, theme.css is tailwind (`theme-two-artifacts-one-palette`)
- 5. Programmatic API
  - 5.1 Drive addComponent from tooling with the CLI's exact contract (`api-add-component-programmatic`)
  - 5.2 Read the registry and config through the API, never stale copies (`api-registry-config-reads`)

## 1. Ownership model

### 1.1 Customize by editing the copied file; it is your code

**Impact: MEDIUM** - re-export shims and registry reach-backs fight the ownership model - the one file that matters drifts behind an indirection

Each copy is a self-contained project file: markup, props, and the style declarations spliced in for the chosen variant, importing only the peer packages and the sibling files the CLI copied beside it. Editing it is the supported customization path - change the markup, add a prop, retune the style declarations; nothing upstream can drift out from under you because nothing upstream exists at runtime. Do not wrap copies in re-export shims, and do not reach back into `node_modules/@hellajs/ui/registry/**` - that is the registry's canonical form (marker regions, unspliced style placeholders), not the component you added.

**Incorrect (what is wrong):**

```ts
// A re-export shim over "the real source" in the registry folder: the
// canonical is a splice template (marker regions, undefined style bindings),
// and the subpath resolves nowhere through the package exports map anyway.
export { Button } from "@hellajs/ui/registry/button/button";
```

**Correct (what is right):**

```tsx
import { mount } from "@hellajs/dom";

// src/components/button.tsx is yours after the copy - edit markup, widen
// props, change classes. The copy imports only the peers beside it.
function SaveButton(props: { class?: string; children?: string }): JSX.Element {
  return (
    <button type="submit" class={["ui-btn", props.class]}>
      {props.children}
    </button>
  );
}

const App = () => <SaveButton class="ui-btn-wide">Save</SaveButton>;

mount(App, "#app");
```

Reference: `packages/ui/docs/concepts/installation.mdx` and `packages/ui/registry/button/button.tsx`

### 1.2 Never import @hellajs/ui at runtime; run the CLI

**Impact: CRITICAL** - the package exports CLI functions only - a component import fails to resolve and the build breaks

`@hellajs/ui` has no importable component surface: the npm artifact is the CLI (`bin/hellajs-ui.js` over `dist/index.js`), and its module entry exports only the tooling functions (`main`, `addComponent`, `initProject`, `listComponents`, `loadRegistry`, `readConfig`, `applyStyleVariant`, `inlineTypes`). Components reach a project as copied source files (`src/components/<name>.tsx`) that import nothing but the peers beside them, and the package never becomes a runtime dependency - any package runner (`npx`, `bunx`, `pnpm dlx`) can drive it. Importing a component from the package (or from a registry subpath) fails resolution: the `exports` map exposes only the dist entry points.

**Incorrect (what is wrong):**

```ts
import { Button } from "@hellajs/ui";
import { Button as RegistryButton } from "@hellajs/ui/registry/button/button";

// Both fail: the entry exports CLI functions, and the exports map exposes
// no registry subpath - there is no component surface to import.
const go = () => <Button variant="outline">Go</Button>;
```

**Correct (what is right):**

```ts
import { main } from "@hellajs/ui";

// The package is its CLI. Run it (npx @hellajs/ui add button) or drive the
// same dispatch programmatically; the component lands as project source in
// src/components/button.tsx and is imported from the copy.
const code: number = await main(["add", "button", "--style", "css"]);
```

A scaffold or generator may import the tooling exports (`addComponent`, `loadRegistry`) - that is the package's actual surface; components never are.

Reference: `packages/ui/lib/index.ts` and `packages/ui/package.json` and `packages/ui/docs/concepts/installation.mdx`

### 1.3 Update copies by re-running add with overwrite, never by patching node_modules

**Impact: HIGH** - overwrite silently discards local edits to the copy, and node_modules patches vanish on the next install

`add` never replaces an existing file by default: each existing copy is skipped with a warning (`pass --overwrite to replace`). To adopt upstream changes, re-run `add <name> --overwrite` deliberately - the replace discards your local edits to that copy, so commit or hand-merge first. Never restyle by editing the registry under `node_modules/@hellajs/ui/registry/`: those files are the canonical splice sources, local to the install, replaced on every reinstall, invisible to your project's version control, and never reaching the copy already sitting in `src/components/`.

**Incorrect (what is wrong):**

```ts
import { readFileSync, writeFileSync } from "node:fs";

// "Restyle" by patching the registry inside node_modules: lost on the next
// install, invisible to git, and the already-copied button.tsx never sees it.
const path = "node_modules/@hellajs/ui/registry/button/button-css.ts";
writeFileSync(path, readFileSync(path, "utf8").replace("bg-primary", "bg-red-500"));
```

**Correct (what is right):**

```ts
import { addComponent } from "@hellajs/ui";

// Adopt upstream changes deliberately: the default add skips existing files
// with a warning; overwrite replaces them (local edits are discarded -
// commit or hand-merge first).
addComponent(["button"], { overwrite: true });
```

Reference: `packages/ui/lib/internal/copy.ts copyFiles` and `packages/ui/tests/cli/add.test.ts`


## 2. CLI workflow

### 2.1 hella.ui.json holds per-project defaults; flags override per call

**Impact: MEDIUM** - an invalid config value throws a named error instead of falling back, and per-call style flags silently mix variants when the config was never set

Every add resolves four fields - `componentsDir` (`src/components`), `style` (`css`), `themeMode` (`light`), `lang` (`ts`) - by explicit option first, then `hella.ui.json`, then the built-in default per field. The config is the right home for the one-time decisions (the style especially); flags are for one-off overrides. Values are validated at read and at add: invalid JSON, or a `style`/`themeMode`/`lang` outside its enum, throws the named `[ui] readConfig:` / `[ui] addComponent:` error rather than silently falling back.

**Incorrect (what is wrong):**

```ts
import { readConfig } from "@hellajs/ui";

// A hand-edited { "style": "scss" } in hella.ui.json makes every command at
// this root throw - [ui] readConfig: style must be one of css, tailwind -
// instead of quietly falling back to the css default.
const config = readConfig();
```

**Correct (what is right):**

```ts
import { readConfig } from "@hellajs/ui";

// The effective copy plan: config fields, each falling back to its default
// (componentsDir "src/components", style "css", themeMode "light", lang "ts");
// per-call flags override these without rewriting the file.
const config = readConfig();
const style: string = config.style; // "css" | "tailwind"
const target: string = config.componentsDir;
```

A config written before a field existed keeps behaving as its default - no migration is needed.

Reference: `packages/ui/lib/internal/config.ts readConfig` and `packages/ui/tests/cli/config.test.ts`

### 2.2 Run init once before adding components; it owns the theme entry

**Impact: HIGH** - css copies import the tokens sheet beside them - components added without the theme carry a dangling import and an unregistered palette

`init` does two things once per project: writes `hella.ui.json` (an existing file is kept unless `--force` rewrites it) and adds the shared `theme` entry through the same add path - `tokens.ts` for the css style, `theme.css` plus the shared `cn` helper for tailwind. The theme is why: every css-flavor copy imports `./tokens.js` beside it (the splice rewrites the registry's `../theme/tokens.js` reference to a components-dir sibling), so components added without the theme entry carry an import to a file that does not exist and a palette that resolves to nothing. `init` runs at the project root - the peer check reads `package.json` there.

**Incorrect (what is wrong):**

```ts
import { addComponent } from "@hellajs/ui";

// No init, no theme entry: the css copy's spliced style module imports
// ./tokens.js, which was never copied - broken resolution, empty palette.
addComponent(["button"]);
```

**Correct (what is right):**

```ts
import { initProject } from "@hellajs/ui";

// One-time, at the project root: writes hella.ui.json (kept unless force)
// and adds the theme entry - tokens.ts (css) or theme.css + cn (tailwind).
initProject({ themeMode: "light" });
```

The theme entry can also be added standalone (`add theme`) when the config already exists; the invariant is one theme per project, imported once in the app entry.

Reference: `packages/ui/lib/initProject.ts initProject` and `packages/ui/docs/concepts/installation.mdx`

### 2.3 Reserve --lang js for JS-only toolchains; the output still needs the HellaJS compiler

**Impact: MEDIUM** - stripping types buys nothing under Bun or Deno, and the .jsx output is HellaJS JSX - a generic React transpiler cannot consume it

`--lang js` strips TypeScript after the style splice (esbuild, JSX preserved) and retargets the copied names - `.tsx` becomes `.jsx`, other `.ts` files (`cn`, `tokens`) become `.js`, and `theme.css` rides through verbatim. It exists for toolchains that only speak JavaScript: Bun and Deno execute the TypeScript copies natively, so keep the `ts` default there. The `.jsx` output is not browser-ready and not React JSX - HellaJS JSX compiles to vnode calls, so the project still needs the HellaJS compiler (`vite-plugin-hellajs`); a generic JSX transpiler is not a substitute.

**Incorrect (what is wrong):**

```ts
import { addComponent } from "@hellajs/ui";

// Bun project, js flag "for compatibility": Bun runs the TS copies as-is,
// so the strip buys nothing - and the .jsx output is still HellaJS JSX,
// not something a generic React transform can consume.
addComponent(["button"], { lang: "js" });
```

**Correct (what is right):**

```ts
import { addComponent } from "@hellajs/ui";

// JS-only toolchain: the strip runs after the splice and every TS name
// retargets. Wire vite-plugin-hellajs so the .jsx output compiles to the
// vnode calls the runtime consumes.
addComponent(["button"], { lang: "js" });

const renameContract: Record<string, string> = {
  "button.tsx": "button.jsx",
  "cn.ts": "cn.js",
  "tokens.ts": "tokens.js",
};
```

`lang` defaults to `ts` and can be persisted in `hella.ui.json` like the style.

Reference: `packages/ui/lib/internal/strip.ts stripTypes` and `packages/ui/docs/concepts/plain-javascript.mdx` and `packages/ui/tests/cli/plainjs.test.ts`

### 2.4 Discover component names with list; names are kebab-case registry slugs

**Impact: LOW** - a guessed PascalCase or plural name fails the add with a named not-found throw - cheap, but avoidable by reading the catalog first

Registry names are kebab-case slugs (`alert-dialog`, `native-select`, `input-otp`), not PascalCase exports - `AlertDialog` is a component the copy exports, never a name the CLI resolves. `list` prints every entry; `listComponents()` returns them sorted. Resolution validates up front: an unknown name throws `[ui] resolveEntry: component "<name>" not found in registry`, and a component unavailable at the chosen style throws its own named error. Read the catalog instead of guessing.

**Incorrect (what is wrong):**

```ts
import { addComponent } from "@hellajs/ui";

// PascalCase guess: the registry holds "alert-dialog", not "AlertDialog" -
// throws [ui] resolveEntry: component "AlertDialog" not found in registry.
addComponent(["AlertDialog"]);
```

**Correct (what is right):**

```ts
import { listComponents } from "@hellajs/ui";

const names: string[] = listComponents(); // the live catalog, sorted slugs
const hasDialog: boolean = names.includes("alert-dialog");
```

Dependencies do not need to be named: `add <name>` resolves each entry's registry dependencies recursively and copies them alongside.

Reference: `packages/ui/lib/listComponents.ts listComponents` and `packages/ui/lib/internal/registry.ts resolveEntry` and `packages/ui/docs/concepts/cli.mdx`

### 2.5 Install the peers the add hint names; they never arrive transitively

**Impact: HIGH** - copied source imports @hellajs/* and the tailwind helpers as YOUR dependencies - skipping the hint leaves a build that cannot resolve them

Copied source imports its packages as regular dependencies of the target project - `@hellajs/ui` itself is never a runtime dependency, so nothing arrives transitively. `add` reads the target root's `package.json` (it throws when there is none, or when the JSON is unparseable) and warns, naming exactly the missing packages with an `npm install` line: every component declares `@hellajs/core` and `@hellajs/dom`; the css style adds `@hellajs/css`; the tailwind style adds `clsx`, `tailwind-merge`, and `tw-animate-css`; the interactive set (menus, popovers, dialogs, overlays, tabs) adds `@hellajs/headless`. The warning is not the build failing - that happens later, at import resolution, far from the command that named the fix. Install exactly what the hint names.

**Incorrect (what is wrong):**

```ts
import { addComponent } from "@hellajs/ui";

// "The CLI ran fine, so the peers must be fine" - the add only warns. The
// css copy imports @hellajs/css, which resolves nowhere in package.json;
// the build fails at resolution, not at add.
addComponent(["button"]);
```

**Correct (what is right):**

```ts
// The peer sets per style - install the missing subset the hint names:
const cssPeers: string[] = ["@hellajs/core", "@hellajs/dom", "@hellajs/css"];
const tailwindPeers: string[] = [
  "@hellajs/core",
  "@hellajs/dom",
  "clsx",
  "tailwind-merge",
  "tw-animate-css",
];
// Interactive components (dialog, menu, popover, tabs, ...) add @hellajs/headless.
```

The peer list for a given add is the union over every resolved entry, dependencies included.

Reference: `packages/ui/lib/internal/peers.ts checkPeers` and `packages/ui/docs/concepts/cli.mdx` and `packages/ui/tests/cli/add.test.ts`


## 3. Style variants

### 3.1 Consume copies, not canonical source; markers and splice modules are registry internals

**Impact: HIGH** - a hand-copied canonical ships marker comments and undefined style bindings - the component crashes at first render

The registry's canonical form is a splice template, not a component: `// @hella:styles` and `// @hella:compose` marker regions (consumed and stripped at copy time), ambient `declare const` placeholders where the style module lands, and sibling style/types modules (`<name>-css.ts`, `<name>-tailwind.ts`, `<name>-types.ts`) that are never copied as files. Hand-copying `registry/<name>/<name>.tsx` out of node_modules bypasses the splice: the markers ride along as inert comments and the style bindings (`base`, `variants`) are undefined at render. `applyStyleVariant` and `inlineTypes` are the tooling surface over this contract - the same two passes `add` runs (splice the style module into the marker regions, inline the shared types module at its import site) - for generators that must reproduce add output; app code takes the copy.

**Incorrect (what is wrong):**

```tsx
// Hand-copied canonical straight from the registry folder: the compose
// array references `base` and `variants`, which only exist after the CLI
// splices the style module - ReferenceError at first render, markers
// riding along as dead comments.
const cls = [base, variants["default"]];
```

**Correct (what is right):**

```ts
import { applyStyleVariant, inlineTypes } from "@hellajs/ui";

// Tooling that must reproduce add output runs the same two passes: splice a
// style module into a canonical's marker regions, then inline the shared
// types module at its import site. App code never does this - it takes the
// copy `add` writes.
const canonical = [
  "// @hella:styles",
  "// @hella:end",
  'import type { P } from "./x-types.js";',
  "// @hella:compose",
  "[base]",
  "// @hella:end",
].join("\n");
const styleModule = 'export const base = "inline-flex rounded-md";\n';
const typesModule = "export type P = { class?: string };\n";

const spliced: string = applyStyleVariant(canonical, styleModule, "css");
const standalone: string = inlineTypes(spliced, typesModule);
```

Marker lines must stay standalone in any source fed to the splice - a trailing code fragment on a marker line, or an unknown `@hella:` marker, throws instead of shipping silently.

Reference: `packages/ui/lib/internal/transform.ts applyStyleVariant` and `packages/ui/lib/internal/registry.ts resolveEntry` and `packages/ui/tests/cli/apply-style-variant.test.ts`

### 3.2 Override through the class prop; the copy composes it last

**Impact: MEDIUM** - reaching past the class prop (blind class edits, cascade fights) misses the one composition point every copy owns

Every copied component destructures `class` and places it as the final member of its class composition (`[base, variants[variant], sizes[size], cls]` in the css copy), with the remaining attributes spread after it. That position is the override contract: in the css flavor your classes join the plain array and precedence resolves through the normal cascade - registry declarations are unlayered CSS, so an author stylesheet imported after the theme wins equal-specificity ties, and a more specific selector wins otherwise. In the tailwind flavor the composition runs through `cn` (clsx plus tailwind-merge), so a same-group utility from the `class` prop (`bg-blue-600` against a baked `bg-primary`) mechanically wins. Retinting the whole palette is theme work; restyling one instance is a `class` prop.

**Incorrect (what is wrong):**

```tsx
import { mount } from "@hellajs/dom";

// Fighting the composition: bypassing the copy's class prop and restyling
// through a global selector beats today's cascade and breaks with every
// registry refresh - and !important chains only grow.
const App = () => <button class="my-btn-override">Go</button>;

mount(App, "#app");
```

**Correct (what is right):**

```tsx
import { mount } from "@hellajs/dom";

// The copy composes the class prop LAST: css flavor as the final array
// member (the cascade settles ties), tailwind flavor as cn's final argument
// (tailwind-merge keeps the prop's utilities, drops same-group conflicts).
function Button(props: { class?: string; children?: string }): JSX.Element {
  return (
    <button class={["inline-flex rounded-md", props.class]}>{props.children}</button>
  );
}

const App = () => <Button class="w-full">Go</Button>;

mount(App, "#app");
```

Reference: `packages/ui/registry/button/button.tsx` and `packages/ui/docs/concepts/theming.mdx`

### 3.3 Pick one style - css or tailwind - and copy every component at it

**Impact: HIGH** - mixing per-call style flags lands two theming systems and mutually dangling imports (tokens without cn, cn without tokens)

Both styles deliver the same component behavior; only the class carrier differs. The css style splices `@hellajs/css` `style()` maps into each copy and keeps a live class array on the element, with `tokens.ts` as its theme artifact. The tailwind style inlines utility strings at the element inside `cn(...)`, with `theme.css` and the shared `cn` helper as its artifacts, and touches no `@hellajs/css` API anywhere. The two flavors' files are not interchangeable: a css copy reads `./tokens.js`, a tailwind copy reads `./cn.js` and utility classes. Set the style once in `hella.ui.json` and let every add inherit it; per-call `--style` flags are the mechanism by which a mixed tree happens.

**Incorrect (what is wrong):**

```ts
import { addComponent } from "@hellajs/ui";

// Per-call style flags: button lands as css (class arrays + tokens),
// dialog lands as tailwind (cn + theme.css) - two theming systems, two
// class carriers, one project.
addComponent(["button"]);
addComponent(["dialog"], { style: "tailwind" });
```

**Correct (what is right):**

```ts
import { addComponent } from "@hellajs/ui";

// hella.ui.json: { "style": "css" } - the one-time decision; every add
// inherits it, so the tree carries one carrier and one palette artifact.
addComponent(["button", "dialog", "input"]);
```

Reference: `packages/ui/lib/addComponent.ts addComponent` and `packages/ui/docs/concepts/cli.mdx` and `packages/ui/tests/cli/add.test.ts`


## 4. Theming

### 4.1 Togglable dark mode is the .dark ancestor class

**Impact: MEDIUM** - toggling data-theme or color-scheme flips nothing - both palettes remap under a .dark ancestor selector

Dark mode is the `.dark` class: both theme artifacts remap the palette under a `.dark` ancestor selector, and the class works on `<html>` or any subtree, so sections of a page can theme independently. Toggle it imperatively on `document.documentElement` (or a subtree root) driven by a signal. There is no `data-theme` attribute contract and no `color-scheme` switch - the selector is the whole mechanism, the same contract shadcn's own components style their dark variants against.

**Incorrect (what is wrong):**

```ts
// data-theme / color-scheme toggling: nothing in either theme artifact keys
// off these - the palette stays light while the flag flips.
document.documentElement.setAttribute("data-theme", "dark");
```

**Correct (what is right):**

```ts
import { signal } from "@hellajs/core";

const isDark = signal(false);

const toggleTheme = (): void => {
  isDark(!isDark());
  document.documentElement.classList.toggle("dark", isDark());
};
```

An app that never toggles dark mode should use the dark-default sheet instead (`themeMode: "dark"`) and drop the class machinery entirely.

Reference: `packages/ui/registry/theme/tokens.ts` and `packages/ui/docs/concepts/theming.mdx`

### 4.2 themeMode dark is the css-only dark-default sheet, not a toggle

**Impact: MEDIUM** - dark mode plus tailwind throws at add time, and the dark sheet has no .dark remap - it is for apps that never toggle

`themeMode: "dark"` (in `hella.ui.json`, or `--theme-mode dark` on `init`/`add`) selects a different theme artifact: `tokens.dark.ts` copies in place of `tokens.ts` - the dark palette registered on `:root` with no `.dark` remap, for apps that ship dark-first and never toggle. It supports the css style only - a dark themeMode meeting the tailwind style throws at add time. The two dark paths are distinct: togglable apps keep the default light sheet and toggle the `.dark` class; never-toggle apps set the dark-default sheet once. `init` persists the mode into `hella.ui.json`, so it is a one-time decision, not a per-add flag.

**Incorrect (what is wrong):**

```ts
import { addComponent } from "@hellajs/ui";

// Throws at add time: [ui] addComponent: themeMode "dark" supports the css
// style only, received style "tailwind". Tailwind dark mode is the .dark
// class contract on the default theme.css - there is no dark sheet for it.
addComponent(["theme"], { style: "tailwind", themeMode: "dark" });
```

**Correct (what is right):**

```ts
import { addComponent } from "@hellajs/ui";

// Dark-default, css style: tokens.dark.ts lands AS tokens.ts (same file
// name, dark palette, no remap). Set once via init --theme-mode dark -
// persisted into hella.ui.json, inherited by every later add.
addComponent(["theme"], { themeMode: "dark" });
```

Reference: `packages/ui/lib/addComponent.ts addComponent` and `packages/ui/registry/theme/tokens.dark.ts` and `packages/ui/tests/cli/registry.test.ts`

### 4.3 Import the theme artifact once, before any styled component mounts

**Impact: HIGH** - the palette registers as :root custom properties at import time - imported late or never, every token resolves to nothing

The css theme artifact (`tokens.ts`) is a `vars` sheet registering the light palette as custom properties on `:root` and remapping the same properties under `.dark`; the tailwind artifact (`theme.css`) is a plain stylesheet carrying the same palette plus the `@theme inline` utility mapping and the `tw-animate-css` import. Both act at import time and are per-app singletons: import the css sheet once in the app entry, before any styled component mounts (server rendering collects it through `cssText` like every other `@hellajs/css` registration), and link or import `theme.css` once. Every component reads the same properties - without the import the custom properties resolve to nothing and the registry renders unstyled.

**Incorrect (what is wrong):**

```ts
import "./src/components/app-shell";

// tokens never imported at the entry: every var(--primary) in the copied
// components' declarations resolves to nothing - the app renders unstyled
// no matter how correct each copy is. A lazy import races the first paint.
```

**Correct (what is right):**

```ts
// entry.tsx (css flavor): the sheet registers the palette on :root - import
// it first, before any styled component mounts; SSR collects it via cssText().
import "./src/components/tokens";

// tailwind flavor instead: import "./src/components/theme.css"; - once.
```

Reference: `packages/ui/registry/theme/tokens.ts` and `packages/ui/docs/concepts/theming.mdx`

### 4.4 Keep the theme artifacts straight - tokens.ts is css, theme.css is tailwind

**Impact: MEDIUM** - pulling @hellajs/css machinery into a tailwind project (or tokens.ts without the css style) adds a runtime the flavor exists to avoid

One palette, two artifacts. The css flavor's `tokens.ts` is a `@hellajs/css` `vars` sheet exporting `tokens`, a camelCase-keyed map whose every key resolves to its `var(--kebab)` reference (`tokens.primaryForeground` is `var(--primary-foreground)`); copied css components import it for typed token access, and the custom-property names stay kebab. The tailwind flavor's `theme.css` is plain CSS with zero JavaScript and zero `@hellajs/css` - utilities (`bg-primary`, `text-foreground`, `rounded-md`) read the same token names through the `@theme inline` mapping. The split is deliberate: a tailwind project should not need a CSS-in-JS runtime for its palette. Do not import `tokens.ts` in a tailwind project or reach for `@hellajs/css` there; do not expect a `tokens` export from `theme.css`.

**Incorrect (what is wrong):**

```ts
// Tailwind project reaching for the css artifact: drags the @hellajs/css
// runtime in for nothing - the tailwind copies read utility classes off
// theme.css and never touch the tokens map.
import { tokens } from "./src/components/tokens";

const primary: string = tokens.primary;
```

**Correct (what is right):**

```ts
// One palette, two carriers - identical token names, different machinery:
//   css: tokens.ts (a vars sheet) - `tokens.primary` is "var(--primary)";
//        import once; typed token access for your own rules.
//   tailwind: theme.css (plain CSS, zero JS, zero @hellajs/css) - the
//        `bg-primary` utility reads --primary through @theme inline.
const paletteTokens: string[] = ["--primary", "--foreground", "--muted", "--border", "--ring"];
```

For joining class fragments in your own css-flavor code, `cx` from `@hellajs/css` is the joiner; the tailwind flavor's joiner is the copied `cn`.

Reference: `packages/ui/docs/concepts/theming.mdx` and `packages/ui/registry/theme/theme.css` and `packages/ui/registry/theme/tokens.dark.ts`


## 5. Programmatic API

### 5.1 Drive addComponent from tooling with the CLI's exact contract

**Impact: MEDIUM** - scaffolding that guesses the options contract writes wrong-flavor files or silently skips existing ones

`addComponent(names, options)` is the add command as a function - same validation, same throw contracts, same copy pipeline: options override `hella.ui.json` per field; names resolve recursively (dependencies copy alongside, a shared dependency resolves once, a cycle throws); the peer check runs against the target root's `package.json` (throwing when it is absent); existing files are skipped with a warning unless `overwrite` is set. Empty names, or an invalid `style`/`themeMode`/`lang`, throw the same `[ui] addComponent:` errors the CLI surfaces. Pass `dir` explicitly whenever the process cwd is not the target project.

**Incorrect (what is wrong):**

```ts
import { addComponent } from "@hellajs/ui";

// Scaffold tool guessing names and options: "Button" is not a registry
// slug (throws not-found), "base" is not a style (throws the two-style
// contract), and without dir the peer check reads the tool's own
// package.json, not the target project's.
addComponent(["Button"], { style: "base" as "css" });
```

**Correct (what is right):**

```ts
import { addComponent } from "@hellajs/ui";

// Same contract as the CLI: options override hella.ui.json per field; the
// peer check reads dir's package.json; overwrite is opt-in (the default
// skips existing files with a warning).
addComponent(["dialog", "button"], {
  dir: "path/to/project",
  overwrite: true,
});
```

Reference: `packages/ui/lib/addComponent.ts addComponent` and `packages/ui/tests/cli/cli-e2e.test.ts`

### 5.2 Read the registry and config through the API, never stale copies

**Impact: LOW** - hardcoding the component catalog or re-parsing registry.json drifts as the registry ships new entries

The registry ships as data (`registry/registry.json`, entries keyed by name with shared `files`/`deps` and per-style slots), and the package exposes it directly: `loadRegistry()` returns the parsed manifest, `listComponents()` the sorted names, `readConfig(dir)` the effective copy plan for a project root. Generators, docs tooling, and migration scripts should read these at run time - a hardcoded name list or a hand-copied manifest goes stale the moment the registry ships a new entry. Per-style details (extra deps, registry dependencies, the `darkFiles` substitution map) live on each entry's `styles` slot.

**Incorrect (what is wrong):**

```ts
// Hardcoded catalog drifts silently: the registry ships new entries across
// releases, and the script keeps scaffolding from a stale snapshot.
const COMPONENTS = ["button", "card", "dialog"];
```

**Correct (what is right):**

```ts
import { listComponents, loadRegistry, readConfig } from "@hellajs/ui";

const names: string[] = listComponents(); // the live catalog, sorted
const manifest = loadRegistry(); // RegistryManifest: entries keyed by name
const dialogDeps: string[] = manifest.entries["dialog"]!.deps ?? [];
const plan = readConfig(); // the effective copy plan for this root
const flavor: string = plan.style;
```

Reference: `packages/ui/lib/loadRegistry.ts loadRegistry` and `packages/ui/lib/internal/config.ts readConfig` and `packages/ui/lib/types.d.ts`


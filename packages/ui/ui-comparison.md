# HellaJS @hellajs/ui vs. shadcn/ui / Base UI / Park UI

A ground-up comparison based on the actual source code of `@hellajs/ui` v2. Every claim below was verified against `packages/ui/lib/`. Competitor facts were researched in September 2026 from official sources (npm registry, official docs and READMEs); researched versions: shadcn CLI 4.21.0, `@base-ui-components/react` 1.0.0-rc.0, Park UI CLI 1.0.1 with `@park-ui/panda-preset` 0.43.1 and Ark UI 5.39.2.

---

## 1. At-a-Glance Summary

| Dimension | HellaJS ui | shadcn/ui | Base UI | Park UI |
|---|---|---|---|---|
| Distribution model | CLI copies owned source; the package is the CLI (`lib/main.ts`) | CLI copies owned source from a registry platform | Traditional npm package, imported at runtime | CLI or docs copy of owned source |
| Importable runtime surface | None; the copied file is the component (`lib/addComponent.ts`) | None for components; Radix primitives install as packages | The library itself is the runtime | None for components; Ark UI + Panda CSS install as packages |
| Styling approach | Two flavors: `@hellajs/css` layered maps or plain Tailwind strings, spliced at copy time (`lib/internal/transform.ts`) | Tailwind v4 + CSS variables | Unstyled, bring your own CSS | Panda CSS recipes |
| Behavior primitives | `hook:` wiring to `@hellajs/dom` behaviors, no querySelector (`registry/dialog/dialog.tsx`) | Radix UI or Base UI or React Aria (`--base` choice) | Its own headless primitives are the product | Ark UI (headless machines) |
| Framework | Framework-agnostic source: JSX and runtime `html` formats (`lib/types.d.ts`) | React primary; other frameworks via ports | React only | React, Vue, Solid via Ark UI |
| Theming | Split theme: `tokens.js` (css) or `theme.css` (tailwind), both under `@layer hella` | CSS variables + Tailwind theme | None (unstyled) | Panda CSS presets and themes |
| Catalog (v1) | 5 components + theme + cn (`registry/registry.json`) | 50+ components, blocks, charts | 30+ headless components | 40+ components |
| Config file | `hella.ui.json` (`lib/internal/config.ts`) | `components.json` | none needed | `park-ui.json` |

HellaJS ui applies the copy/paste distribution model to its own framework-neutral component source: the npm package contains a CLI and a registry of canonical component files, and `add` splices the chosen style flavor into the chosen markup format before writing one owned file per component. shadcn/ui is the same distribution idea at 10x the catalog and ecosystem scale, backed by Radix or Base UI primitives and Tailwind. Park UI is the closest styling-architecture sibling (owned source over headless machines), but couples to Panda CSS and Ark UI. Base UI is the deliberate counterpoint: nothing is copied and nothing is styled; you import headless primitives and write every style yourself.

---

## 2. Distribution and Ownership Model

### HellaJS ui

- The npm artifact is a CLI: `bin/hellajs-ui.js` runs `main` from `lib/main.ts`, which dispatches `init`, `add`, and `list`; there is no importable component export (`lib/index.ts` exports config, resolution, and transform functions, not components).
- The registry is a manifest plus canonical source files shipped inside the package (`lib/loadRegistry.ts` reads `registry/registry.json`). Component entries declare shared files and per-style slots; style modules (`<name>-<style>.ts`) are splice sources, never copied.
- `add` resolves the component plus its registry dependencies recursively with a cycle guard (`lib/internal/registry.ts`), checks the target project for the npm packages the copied source imports (`lib/internal/peers.ts`), then copies and transforms the files (`lib/internal/copy.ts`): the style module body splices into the canonical's `@hella:styles` marker region, and tailwind additionally wraps the class array in `cn(...)` with an injected helper import (`lib/internal/transform.ts`).
- The copied file is standalone: it imports only the framework peers the CLI copied or checked, never the registry or `@hellajs/ui` (`docs/concepts/copy-paste-model.mdx`).

### shadcn/ui

- The CLI (`shadcn`) reads a flat-file registry schema and `components.json`, then writes component source and dependency lists into the project (`shadcn add`). The 4.x CLI adds `diff`, preset apply/decode, private registry namespaces with auth, and an MCP server so AI agents can install components.
- Components are React source files built on a primitive base; the `--base` flag selects between Radix UI, Base UI, and React Aria as the headless layer, with Tailwind v4 and CSS-variable theming as the default styling contract.
- The distribution platform is broad: components, blocks, charts, themes, and third-party registries are all installable through the same CLI.

### Base UI

- No distribution step at all: `@base-ui-components/react` installs as an npm package and is imported at runtime. Components are unstyled and composable; the library's value is its accessibility-tested behavior layer (WAI-ARIA patterns, screen-reader and platform testing per the official docs).
- Ownership comes from styling freedom, not source ownership: you never edit Base UI code, you style and compose it.

### Park UI

- Components distribute as source through the CLI or direct copy from the docs, the same ownership model as shadcn and HellaJS ui (`park-ui.com/docs`).
- Every component composes Ark UI headless parts with Panda CSS recipes; the copied source depends on both runtimes, and theming flows through Panda CSS presets rather than raw CSS.

**Verdict:** HellaJS ui, shadcn/ui, and Park UI share the ownership thesis (the copied file is yours), while Base UI anchors the import-and-style counterpoint that makes the trade-offs visible. HellaJS ui's differentiator inside that shared model is economy: the registry ships one canonical file per markup format plus one style module per flavor, the CLI splices them at copy time, and the result imports nothing the CLI did not copy or check. shadcn/ui and Park UI copy richer, multi-file component structures that keep depending on their primitive runtimes (Radix/Base UI/Aria and Ark UI respectively) after installation.

---

## 3. Dependencies

Dependency facts come from each package's `package.json` (HellaJS: `packages/ui/package.json`, npm registry for the competitors).

| | HellaJS (ui) | shadcn/ui | Base UI | Park UI |
|---|---|---|---|---|
| Runtime deps of the package | 0 (CLI bundles on node builtins) | 30+ (CLI: babel, ts-morph, MCP SDK, commander, ...) | 7 (`@floating-ui/react-dom`, `tabbable`, `reselect`, ...) | CLI 13; components depend on `@ark-ui/*` |
| Peer deps | `@hellajs/core`, `@hellajs/dom`, `@hellajs/css` (optional) | none for the CLI; copied components depend on Tailwind + Radix/Base UI/Aria + `clsx` + `tailwind-merge` + `class-variance-authority` | `react`, `react-dom`, `@types/react` | `@pandacss/dev` for the preset; `react`/`react-dom` via Ark UI |
| Copied component's runtime needs | the framework peers the copy declared, checked at add time (`lib/internal/peers.ts`) | the primitive base + Tailwind + `cn` helpers | n/a (imported library) | Ark UI + Panda CSS runtime |
| Dev-only helper deps | `clsx`, `tailwind-merge` (typecheck only, never peers) | runtime deps of the copied file | n/a | n/a |

- HellaJS ui's own dependency list is empty by design: `lib/` uses only node builtins, so the CLI bundles standalone (`packages/ui/AGENTS.md`, §Non-obvious). The peers exist for the copied source, and `checkPeers` names exactly the missing packages with an install hint (`lib/internal/peers.ts`).
- The tailwind flavor's `cn.ts` imports `clsx` and `tailwind-merge` in the user's project; those two packages are devDependencies here only so the registry source typechecks with real types (`packages/ui/AGENTS.md`, §Registry gotchas).
- All three copy/paste systems converge on the same helper stack for Tailwind projects: `clsx` plus `tailwind-merge`, wrapped in a `cn` function. HellaJS ui's css flavor needs neither, because class composition is a plain array and precedence is delegated to cascade layers.

---

## 4. Styling and Theming

### HellaJS ui

- The css flavor splices `style()` maps into the copied file; every declaration emits under the `hella` cascade layer via the style `layer` option (`registry/button/button-css.ts`). Class composition is a plain array in the `class` attribute, joined by dom's renderProp.
- The tailwind flavor splices plain utility-string maps and wraps the compose array in `cn(...)`, injecting the `cn` import (`registry/button/button-tailwind.ts`, `lib/internal/transform.ts`).
- Theming is split by flavor: css projects get `tokens.js`, a `vars()` sheet collected by `cssText()` for SSR; tailwind projects get `theme.css`, shadcn's own new-york-v4 theme (the `@theme inline` block, `:root`/`.dark` palettes, `@layer base` reset, and a `tw-animate-css` import) with zero JavaScript beyond the copied utilities. Both artifacts carry the same component-consumed token values and both sit in or under the `hella` layer (`registry/theme/`).
- Component styling is byte-faithful to shadcn's new-york-v4: the tailwind modules carry shadcn's class strings verbatim (full Button variant/size set, Dialog enter/exit `animate-in`/`animate-out` utilities), and the css flavor translates the same declarations 1:1 into layered `style()` maps with hand-rolled keyframes (`registry/button/*`, `registry/dialog/dialog-css.ts`).

### shadcn/ui

- Tailwind v4 with CSS variables is the default theming contract (`--css-variables` on init). Components reference semantic tokens (`bg-primary`, `text-muted-foreground`) defined as CSS variables, so retheming is a variable edit and dark mode is a class or attribute flip.
- Variant recipes use `class-variance-authority` (cva) in the copied source, giving typed variant props with Tailwind class values.

### Base UI

- Nothing ships styled: components attach no CSS and prescribe no styling engine. The docs position it as compatible with Tailwind, CSS Modules, plain CSS, or CSS-in-JS.

### Park UI

- Panda CSS recipes generate typed, variant-aware class strings at build time; the copied components call those recipes. Theming flows through Panda CSS presets (`@park-ui/panda-preset`), and token overrides happen in Panda configuration rather than in raw CSS.

**Verdict:** HellaJS ui is the only one of the three copy/paste systems whose css flavor removes the override problem by construction: everything the registry emits sits in one cascade layer, so unlayered author CSS wins without `tailwind-merge`, `!important`, or source-order tricks. Its tailwind flavor, meanwhile, is shadcn's own look - the copied class strings, theme block, and animation utilities are shadcn's verbatim - so a tailwind project gets shadcn parity without React. shadcn/ui and Park UI still push variants through typed recipe systems (cva and Panda respectively) that are more powerful than HellaJS ui's baked maps, and both add a runtime or build-time dependency to every project. Base UI sits outside the comparison by offering no styles at all.

---

## 5. Behavior and Accessibility Wiring

### HellaJS ui

- Interactive components wire behavior through `hook:` lifecycle attributes in the copied markup: Dialog hands the panel to `trapFocus`, `onEscape`, and `onOutside` in `hook:afterMount` and disposes them in `hook:beforeDestroy` (`registry/dialog/dialog.tsx`); Tabs attaches `rovingTabIndex` plus a focusin listener the same way (`registry/tabs/tabs.tsx`).
- The behaviors come from `@hellajs/dom`, pure functions over real nodes, and the copied file never queries the DOM (`docs/concepts/dialog.mdx`, "Behaviors, Not Queries").
- Accessibility attributes are baked into the markup: `role="dialog"`, `aria-modal`, generated `aria-labelledby` ids, `aria-selected`, `aria-controls`, and `hidden` panel toggling (`registry/dialog/dialog.tsx`, `registry/tabs/tabs.tsx`).

### shadcn/ui

- Behavior comes from the chosen primitive base: Radix UI (historically default), Base UI, or React Aria since CLI 4.x. These are full accessibility engines with focus management, portals, scroll locking, and screen-reader announcements handled inside the primitive package.
- The copied component is a thin styled wrapper around the primitive's composable parts.

### Base UI

- Accessibility is the product: headless components and hooks implement WAI-ARIA patterns, focus management, and platform-specific fixes, tested across screen readers and browsers (official docs, Accessibility section).

### Park UI

- Ark UI supplies the headless machines (state, keyboard, aria) consumed by every Park UI component; the copied source owns only the styling recipe and the part composition.

**Verdict:** HellaJS ui takes the thinnest accessibility layer of the three: it wires proven headless behaviors only where the component needs them (dialog focus management, tabs roving) and leaves everything else as plain accessible markup. That keeps the copied file free of primitive-package dependencies but gives it a far smaller guarantee surface: no scroll locking, no focus-scope restore beyond the trap's own restore, no composite widget machinery beyond roving tabindex. shadcn/ui, Base UI, and Park UI all delegate to dedicated accessibility engines that have absorbed years of edge cases HellaJS ui's five-component catalog has not encountered.

---

## 6. Customization Path

- **HellaJS ui**: edit the copied file. The style maps live inside it, the compose array names its members explicitly, and `props.class` lands last in the composition (`registry/button/button.tsx`). For the css flavor, retheming without editing is the cascade-layer override: unlayered custom-property overrides retint the whole registry (`docs/concepts/theming.mdx`).
- **shadcn/ui**: edit the copied wrapper, or restyle through CSS variables and `cn()` overrides; variant structure comes from the cva recipe inside the file.
- **Base UI**: restyle from scratch; there is nothing to edit, which is the point. Customization means composing hooks and parts with your own CSS.
- **Park UI**: edit the copied component or its recipe; theme-level changes flow through Panda presets and tokens.

HellaJS ui's override contract is the strongest story for css projects: precedence between registry CSS and user CSS is decided by the cascade, not by a class-merging utility, and the same contract covers both themes and one-off tweaks (`docs/concepts/theming.mdx`). The tailwind flavor deliberately gives that power up and rejoins the `cn()` convention the rest of the Tailwind ecosystem expects.

---

## 7. Built-in Features Matrix

| Feature | HellaJS ui | shadcn/ui | Base UI | Park UI |
|---|---|---|---|---|
| Copy/paste CLI | yes (`init`, `add`, `list`) | yes (`init`, `add`, `diff`, `apply`, `preset`, MCP) | no (npm import) | yes (CLI + docs copy) |
| Config file with defaults | `hella.ui.json` (`lib/internal/config.ts`) | `components.json` | n/a | `park-ui.json` |
| Recursive registry dependencies | yes, with cycle guard (`lib/internal/registry.ts`) | yes (registry dependencies) | n/a | yes |
| Peer/package check at add time | yes, names missing packages (`lib/internal/peers.ts`) | yes (installs or warns on deps) | n/a | yes |
| Two markup formats per component | yes: jsx and runtime `html` templates (`lib/types.d.ts`) | no (React JSX) | no (React JSX) | React, Vue, Solid variants |
| Two styling flavors per component | yes: css and tailwind, spliced per choice (`lib/internal/transform.ts`) | one styling system (Tailwind + CSS vars) | unstyled | one styling system (Panda CSS) |
| Missing-file overwrite handling | skip with warning, or `--overwrite` (`lib/internal/copy.ts`) | `--overwrite`, `--diff` | n/a | overwrite prompts |
| Dark mode | both palettes remap under the `.dark` class (`registry/theme/`) | CSS variables + class strategy | bring your own | Panda theme presets |
| SSR-friendly styling | css flavor collects through `cssText()` (`registry/theme/tokens.js`) | Tailwind build output (static CSS) | n/a | Panda static extraction |
| Enter/exit animations | Dialog ships both flavors: hand-rolled keyframes (css) or `tw-animate-css` utilities (tailwind) (`registry/dialog/dialog-css.ts`) | `tw-animate-css` utilities | bring your own | Panda canned animations |
| Component catalog (v1) | 5 components | 50+ components, blocks, charts | 30+ headless components | 40+ components |
| Ecosystem tooling (presets, registries, MCP) | none | extensive | shadcn integration only | themes, Figma kit |

### Notable HellaJS differentiators

- Cascade-layer override contract: every registry declaration emits under `layer: "hella"`, so unlayered author CSS always wins without class-merging utilities (`registry/button/button-css.ts`, `registry/theme/tokens.js`).
- Zero-runtime css flavor: styles are static maps collected for SSR through `cssText()`, with no CSS-in-JS cost after hydration and no `cn` dependency (`registry/button/button-css.ts`).
- Dual markup formats per component: the same component copies as a JSX file or a runtime `html` template file, renamed so imports resolve identically (`lib/internal/copy.ts` rename map, `lib/addComponent.ts`).
- Style splice at copy time: one canonical source per format serves both flavors, so css and tailwind stay two splices of one truth rather than parallel trees (`lib/internal/transform.ts`).
- Framework peers over framework lock-in: copied source depends only on `@hellajs/*` peers the CLI checks for, never on the registry or package (`lib/internal/peers.ts`).

---

## 8. Ergonomics and Syntax

The whole workflow is three commands:

```bash
bunx @hellajs/ui init
bunx @hellajs/ui add button
bunx @hellajs/ui list
```

A copied button is used like any local component, with variant and size props baked into the owned file:

```jsx
import Button from './components/button';

<Button variant="outline" size="lg" class="w-full">Deploy</Button>
```

Compared with the competitors: shadcn/ui's `add` has the same shape but richer options (`--diff`, presets, registry URLs) and a much larger catalog behind it; Park UI's CLI is equivalent for its frameworks; Base UI skips the step entirely, trading install-time ergonomics for zero ownership overhead. HellaJS ui's `--format jsx|html` switch is unique: it is the only one of the four that can hand you the same component as a runtime `html` template for projects that never touch a JSX transpiler.

---

## Bottom Line

HellaJS ui applies the shadcn/ui distribution model to HellaJS's framework-neutral source with an unusually small dependency footprint: one canonical file per markup format, one style module per flavor, a splice engine that makes both flavors two views of one truth, and an override contract (cascade layers) that removes the class-merging machinery the Tailwind-flavored competitors treat as load-bearing. Behavior rides `hook:` attributes to `@hellajs/dom` behaviors instead of a headless component runtime, keeping the copied file self-contained.

What sets HellaJS ui apart, and no single competitor matches all of:

1. **Cascade-layer override contract** (registry CSS and user CSS resolve by cascade construction, with no `tailwind-merge`, `!important`, or source-order management) (`registry/button/button-css.ts`).
2. **Two styling flavors and two markup formats from one canonical source** (css and tailwind, JSX and runtime `html`, all spliced or copied from a single file per component) (`lib/internal/transform.ts`).
3. **Zero package runtime** (the copied file imports only framework peers the CLI checked; the css flavor adds no runtime library at all beyond the framework itself) (`lib/internal/peers.ts`).
4. **Behavior as owned inline wiring** (focus trap, escape, outside close, and roving tabindex are visible in the copied markup through `hook:` attributes rather than hidden inside an imported primitive) (`registry/dialog/dialog.tsx`).

Its gaps are real: the catalog is five components against dozens from each competitor; the accessibility guarantee surface (no scroll locking, no composite-widget machinery, no screen-reader-tested primitives) is a fraction of Radix, Base UI, or Ark UI; there is no ecosystem tooling (no preset marketplace, registry platform, MCP server, or Figma kit); and the project is new, so the "no bug reports, fix it in your codebase" ownership trade carries all of the maintenance itself. Against shadcn/ui specifically, HellaJS ui competes on architecture purity and runtime economy, not on breadth.

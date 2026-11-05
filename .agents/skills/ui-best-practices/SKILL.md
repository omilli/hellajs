---
name: ui-best-practices
description: Best practices for the @hellajs/ui copy/paste component registry CLI: init, add, list, main, addComponent, initProject, listComponents, loadRegistry, readConfig, applyStyleVariant, inlineTypes, hella.ui.json, --style css|tailwind, --theme-mode light|dark, --lang js|ts. Use when adding, configuring, or editing HellaJS registry components in a project: what lands on disk, the two style variants and the cn helper, the tokens.ts / theme.css theme split, peer installs, plain-JS delivery, and updating copies. Covers the silent failure modes: importing @hellajs/ui at runtime (no component surface), adding components without the theme entry, tailwind copies without cn and theme.css, a dark themeMode meeting tailwind, hand-copying canonical source with marker regions. Use ONLY for the registry CLI and copied components - reactive primitives belong to core-best-practices, headless behavior to headless-best-practices, the styling engine to css-best-practices, DOM rendering to dom-best-practices.
---

# ui-best-practices

Grounded rules for `@hellajs/ui`: the registry CLI (`init`, `add`, `list` and their flags), the `hella.ui.json` project config, the two copy styles (css `style()` maps with class arrays vs tailwind utility strings inlined inside `cn(...)`), the split theme artifacts (`tokens.ts` for css, `theme.css` plus `cn.ts` for tailwind), and the ownership contract - every component lands as editable project source with no runtime dependency on the package. Every rule is derived from the package source and its test suite; each rule file cites the symbols and tests that pin it.

## When to Apply

- Any command or code adding `@hellajs/ui` registry components to a project (`npx @hellajs/ui add <name>`, `addComponent`).
- Writing or editing a copied component file under the configured `componentsDir`.
- Choosing or switching the copy style (`css` / `tailwind`), the output language (`ts` / `js`), or the theme mode.
- Wiring the theme: the tokens sheet, `theme.css`, dark mode, or the dark-default palette.
- Installing the peers copied source imports, or diagnosing the add-time peer warning.
- Building tooling that drives the CLI programmatically (`main`, `loadRegistry`, `readConfig`) or reproduces add output (`applyStyleVariant`, `inlineTypes`).

Not for: reactive primitives (`core-best-practices`), headless behavior behind the interactive components (`headless-best-practices`), the styling engine itself (`css-best-practices`), DOM rendering and hydration (`dom-best-practices`).

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
| own | Ownership model | CRITICAL |
| cli | CLI workflow | HIGH |
| variant | Style variants | HIGH |
| theme | Theming | HIGH |
| api | Programmatic API | MEDIUM |

## Rules

### Ownership model (own)

- `own-edit-the-copy` - Customize by editing the copied file; it is your code
- `own-no-runtime-import` - Never import @hellajs/ui at runtime; run the CLI
- `own-update-rerun-overwrite` - Update copies by re-running add with overwrite, never by patching node_modules

### CLI workflow (cli)

- `cli-config-flag-precedence` - hella.ui.json holds per-project defaults; flags override per call
- `cli-init-theme-entry` - Run init once before adding components; it owns the theme entry
- `cli-lang-js-toolchains` - Reserve --lang js for JS-only toolchains; the output still needs the HellaJS compiler
- `cli-list-before-guess` - Discover component names with list; names are kebab-case registry slugs
- `cli-peers-install-hint` - Install the peers the add hint names; they never arrive transitively

### Style variants (variant)

- `variant-canonical-not-app-source` - Consume copies, not canonical source; markers and splice modules are registry internals
- `variant-class-prop-overrides` - Override through the class prop; the copy composes it last
- `variant-one-style-per-project` - Pick one style - css or tailwind - and copy every component at it

### Theming (theme)

- `theme-dark-class-toggle` - Togglable dark mode is the .dark ancestor class
- `theme-dark-default-css-only` - themeMode dark is the css-only dark-default sheet, not a toggle
- `theme-import-once-first` - Import the theme artifact once, before any styled component mounts
- `theme-two-artifacts-one-palette` - Keep the theme artifacts straight - tokens.ts is css, theme.css is tailwind

### Programmatic API (api)

- `api-add-component-programmatic` - Drive addComponent from tooling with the CLI's exact contract
- `api-registry-config-reads` - Read the registry and config through the API, never stale copies

Full rule text, incorrect/correct examples, and source references: `AGENTS.md` in this folder (compiled from `rules/` by `vp run skills-build`).

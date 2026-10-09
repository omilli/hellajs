# @hellajs/ui

Copy/paste component registry for HellaJS: `npx @hellajs/ui add button` copies owned, editable component source into your project. There is nothing to import from the package and no dist to depend on; the npm artifact IS the CLI.

[![NPM Version](https://img.shields.io/npm/v/@hellajs/ui?color=orange)](https://www.npmjs.com/package/@hellajs/ui)
![Gzipped Size](https://img.shields.io/bundlephobia/minzip/@hellajs/ui)

## Documentation

- **[API Reference](https://hellajs.com/reference#hellajsui)**
- **[Components](https://hellajs.com/components)**

## Quick Start

### Installation

No install step is required; run the CLI through your package runner:

```bash
npx @hellajs/ui init
# bunx @hellajs/ui init
```

`init` writes `hella.ui.json` to the project root and adds the shared `theme` entry to your components directory:

```json
{
  "componentsDir": "src/components",
  "style": "css",
  "format": "jsx",
  "themeMode": "light",
  "lang": "ts"
}
```

`themeMode` selects the theme palette: dark-only projects set `"themeMode": "dark"` (or pass `--theme-mode dark`) to copy a dark-only `tokens.ts` with no `.dark` class remap.

### Two styles, one override contract

Every component copies in one of two styles:

- **`css`** (default) composes classes through `@hellajs/css` scoped classes and themes through `tokens.ts`, a `vars()` stylesheet that is server-safe by construction and exports its `tokens` map for the copied components to import. Everything the registry emits is plain unlayered CSS: your own rules and utilities override it through the normal cascade - later registration at equal specificity, higher specificity otherwise.
- **`tailwind`** composes classes through a shared `cn` helper (`clsx` + `tailwind-merge`, copied as `cn.ts`) and themes through `theme.css`, a plain CSS palette with zero JS and zero `@hellajs/css`. Only the element reset sits in tailwind's `base` layer; utilities (and your own CSS) always outrank it.

Css components import the theme's `tokens` map (each key evaluates to the same `var(--*)` reference) and tailwind components read shadcn's literal themed utilities like `bg-primary`, so both styles read the same custom property names. Add the theme once per project (`init` does it) and import it in your app entry; the tailwind theme also requires `tw-animate-css` (the Dialog's animation utilities use it).

### Basic Usage

```bash
# add a component using your configured style and format
npx @hellajs/ui add button

# override the style and format for a single add
npx @hellajs/ui add button --style tailwind --format html

# list every component in the registry
npx @hellajs/ui list
```

| Flag | Applies to | Meaning |
|---|---|---|
| `--style css\|tailwind` | `add` | Registry style to copy. |
| `--format jsx\|html` | `add` | Source format: `.tsx` for JSX, `*-html.ts` (copied as `<name>.ts`) for runtime `html` templates. |
| `--theme-mode light\|dark` | `init`, `add` | Theme palette: `dark` copies the dark-only tokens sheet (css style only). |
| `--dir <path>` | `add`, `init` | Target project root; defaults to the current directory. |
| `--overwrite` | `add` | Replace existing files instead of skipping them. |
| `--force` | `init` | Rewrite an existing `hella.ui.json` with defaults. |

Copied source imports `@hellajs/core` and `@hellajs/dom` as regular packages; `add` reads your `package.json` and prints an install hint naming exactly what is missing. The `css` style also imports `@hellajs/css`; the `tailwind` style imports `clsx` and `tailwind-merge` for the shared `cn` helper plus `tw-animate-css` for the Dialog's animations.

## Components

Fifty-nine components cover the full shadcn new-york-v4 catalog, chart excepted. Each is styled byte-faithfully: same structure, same variants, same class strings (tailwind flavor) or their 1:1 style-map translations (css flavor), same `@theme inline` palette, same enter/exit dialog animations. Dark mode is the `dark` class on `<html>` or any ancestor; dark-only projects copy the dark-default tokens sheet instead through `themeMode: "dark"`.

| Family | Components |
|---|---|
| Core | `button`, `input`, `card`, `dialog`, `tabs` |
| Statics | `badge`, `alert`, `kbd`, `separator`, `skeleton`, `spinner`, `empty`, `label` |
| Forms and data | `textarea`, `native-select`, `table`, `aspect-ratio`, `avatar`, `progress`, `input-otp`, `form` |
| Composites | `button-group`, `input-group`, `field`, `pagination`, `item`, `marker`, `direction` |
| Chat | `bubble`, `message`, `message-scroller`, `attachment` |
| Disclosure | `collapsible`, `accordion` |
| Selection | `checkbox`, `radio-group`, `switch`, `toggle`, `toggle-group` |
| Sliders and panes | `slider`, `resizable` |
| Anchored surfaces | `tooltip`, `hover-card`, `popover` |
| Menus and navigation | `dropdown-menu`, `context-menu`, `menubar`, `navigation-menu`, `breadcrumb` |
| Select and command | `select`, `combobox`, `command` |
| Dialog variants | `alert-dialog`, `sheet`, `drawer` |
| Feedback and focus | `sonner`, `scroll-area` |
| Calendar | `calendar` |
| Layout shells | `sidebar` |

Each copied canonical carries marker regions the CLI splices at `add` time: exactly one `@hella:styles` (the style module's declarations land there) and one `@hella:compose` per styled part (the live class array). The markers never ship - they are consumed by the copy step. Style modules export one lowerCamel binding per styled part that carries classes (`header`, `title`, ...); a part with no classes gets no binding, and an empty-string export appears only as a css/tailwind flavor bridge (an empty binding in one flavor mirrors a live binding in the other). `variants`/`sizes` maps appear only where a component actually has them.

## License

This software is provided "as is" under the MIT License, without any warranties. The authors are not liable for any damages arising from its use.

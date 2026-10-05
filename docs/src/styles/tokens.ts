/**
 * Site design tokens on the hella token vocabulary (unit 06 of the site
 * foundation set). Values are the user-approved port of the current palette:
 * `:root`/`@theme` from `docs/src/global.css` (base-50/100/200/300, primary,
 * primary-content), daisyUI dark `base-content` for foreground text, tailwind
 * slate-700/600 for border/input, and the Mulish font. Registry-named tokens
 * override the registry theme sheets so every surface outside the ui demo
 * frames (chrome, prose, the search palette) renders in the site palette;
 * the `base-*` ladder carries the site's own tonal vocabulary for chrome
 * styles. The ui demo frames are the exception: `Component.astro` imports
 * `@registry/theme/tokens.js` and adds the `dark` class to `.demo-frame`, so
 * the theme sheet's `.dark` class block declares the registry's default dark
 * palette directly on the frame - a direct class-scoped declaration beats
 * this inherited `html:root` block, and the examples render exactly what a
 * dark-default registry install produces. Portal-mounted demo surfaces
 * (dialogs, dropdowns, toasts) escape the frame to `body` and fall back to
 * this site palette. Registered UNLAYERED at `html:root`
 * (`scoped: "html:root"`): registry tokens and site tokens are both
 * unlayered `:root`-family declarations now, and this block sits at
 * `html:root` (0,1,1) so it beats every registry `:root` (0,1,0)
 * registration regardless of registration order - island hydration
 * registers the registry sheet client-side after this static tag and loses
 * on specificity. The palette probe is the guard (a gitignored Playwright
 * script over `astro preview` under docs/dist): body and chrome surfaces
 * must compute to this palette identically on a static page and an island
 * page, and demo frames (`.demo-frame.dark`) must compute to the registry's
 * default dark palette - a failure there is a set-design fork, not a styling
 * bug to patch here.
 * The `sidebar-*` family (unit 09) overrides the registry sidebar css
 * module's own light-value registration (`packages/ui/registry/sidebar/`),
 * whose `.dark` block never applies (the site's html carries no `.dark`
 * class) — without the override, static chrome composing the registry
 * sidebar vocabulary would render the light sheet. Values map the sidebar
 * surfaces onto the site ladder per the current chrome: aside `bg-base-300`
 * → `--sidebar`, daisy menu hover/active → `--base-50`, the rest alias the
 * site tokens. Registered here rather than in the chrome css module so the
 * palette and its sidebar overrides register as one sheet, scoped with the
 * palette to `html:root`.
 * Consume through `cssText()` for the static head styles (unit 08); no
 * export — mirror of the registry theme sheet's side-effect registration
 * contract.
 */
import { vars } from "@hellajs/css";

vars({
  "base-50": "hsl(222.2 47.4% 14%)",
  "base-100": "hsl(222.2 47.4% 8%)",
  "base-200": "hsl(222.2 47.4% 7%)",
  "base-300": "hsl(222.2 47.4% 6%)",
  "base-contrast": "oklch(97.807% 0.029 256.847)",
  primary: "#38EBFF",
  "primary-foreground": "var(--base-300)",
  secondary: "var(--base-200)",
  "secondary-foreground": "var(--base-contrast)",
  "font-sans": "'Mulish Variable', sans-serif",
  background: "var(--base-100)",
  foreground: "var(--base-contrast)",
  card: "var(--base-300)",
  "card-foreground": "var(--base-contrast)",
  popover: "var(--base-300)",
  "popover-foreground": "var(--base-contrast)",
  muted: "var(--base-300)",
  "muted-foreground": "oklch(0.708 0 0)",
  accent: "var(--base-300)",
  "accent-foreground": "var(--primary)",
  destructive: "oklch(0.704 0.191 22.216)",
  border: "oklch(37.2% 0.044 257.287)",
  input: "oklch(44.6% 0.043 257.281)",
  ring: "var(--primary)",
  radius: "0.625rem",
  sidebar: "var(--base-300)",
  "sidebar-foreground": "var(--foreground)",
  "sidebar-accent": "var(--base-50)",
  "sidebar-accent-foreground": "var(--foreground)",
  "sidebar-primary": "var(--primary)",
  "sidebar-primary-foreground": "var(--primary-foreground)",
  "sidebar-border": "var(--border)",
  "sidebar-ring": "var(--ring)",
}, { scoped: "html:root" });

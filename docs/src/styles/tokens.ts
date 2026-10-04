/**
 * Site design tokens on the hella token vocabulary (unit 06 of the site
 * foundation set). Values are the user-approved port of the current palette:
 * `:root`/`@theme` from `docs/src/global.css` (base-50/100/200/300, primary,
 * primary-content), daisyUI dark `base-content` for foreground text, tailwind
 * slate-700/600 for border/input, and the Mulish font. Registry-named tokens
 * override `packages/ui/registry/theme/tokens.dark.js` so registry components
 * render in the site palette; the `base-*` ladder carries the site's own
 * tonal vocabulary for chrome styles. Registered UNLAYERED on `:root`:
 * unlayered normal declarations outrank every layered one (the registry
 * sheet emits into `@layer hella`), so the overrides hold on every page by
 * cascade rules, independent of module execution order — a shared layer
 * bucket would merge by name with last-writer-wins and flip on island
 * pages, where island SSR registers the registry sheet in-process.
 * The `sidebar-*` family (unit 09) overrides the registry sidebar css
 * module's own light-value registration (`packages/ui/registry/sidebar/`),
 * whose `.dark` block never applies (the site's html carries no `.dark`
 * class) — without the override, static chrome composing the registry
 * sidebar vocabulary would render the light sheet. Values map the sidebar
 * surfaces onto the site ladder per the current chrome: aside `bg-base-300`
 * → `--sidebar`, daisy menu hover/active → `--base-50`, the rest alias the
 * site tokens. Registered here (unlayered) rather than in the chrome css
 * module so the override holds regardless of module execution order.
 * Consume through `cssText()` for the static head styles (unit 08); no
 * export — mirror of the registry theme sheet's side-effect registration
 * contract.
 */
import { vars } from "@hellajs/css";

vars({
  background: "hsl(222.2 47.4% 8%)",
  foreground: "oklch(97.807% 0.029 256.847)",
  card: "hsl(222.2 47.4% 14%)",
  "card-foreground": "oklch(97.807% 0.029 256.847)",
  popover: "hsl(222.2 47.4% 14%)",
  "popover-foreground": "oklch(97.807% 0.029 256.847)",
  primary: "#38EBFF",
  "primary-foreground": "#090e19",
  secondary: "hsl(222.2 47.4% 7%)",
  "secondary-foreground": "oklch(97.807% 0.029 256.847)",
  muted: "hsl(222.2 47.4% 14%)",
  "muted-foreground": "oklch(0.708 0 0)",
  accent: "hsl(222.2 47.4% 14%)",
  "accent-foreground": "#38EBFF",
  destructive: "oklch(0.704 0.191 22.216)",
  border: "oklch(37.2% 0.044 257.287)",
  input: "oklch(44.6% 0.043 257.281)",
  ring: "#38EBFF",
  radius: "0.625rem",
  "base-50": "hsl(222.2 47.4% 14%)",
  "base-100": "hsl(222.2 47.4% 8%)",
  "base-200": "hsl(222.2 47.4% 7%)",
  "base-300": "hsl(222.2 47.4% 6%)",
  "font-sans": "'Mulish Variable', sans-serif",
  sidebar: "var(--base-300)",
  "sidebar-foreground": "var(--foreground)",
  "sidebar-accent": "var(--base-50)",
  "sidebar-accent-foreground": "var(--foreground)",
  "sidebar-primary": "var(--primary)",
  "sidebar-primary-foreground": "var(--primary-foreground)",
  "sidebar-border": "var(--border)",
  "sidebar-ring": "var(--ring)",
});

/**
 * Site design tokens on the hella token vocabulary (unit 06 of the site
 * foundation set). Values are the user-approved port of the current palette:
 * the daisy-era `:root`/`@theme` blocks (base-50/100/200/300, primary,
 * primary-content), daisyUI dark `base-content` for foreground text, tailwind
 * slate-700/600 for border/input, and the Mulish font. The `base-*` ladder
 * carries the site's own tonal vocabulary for chrome styles.
 *
 * Palette architecture (portal escape): `body` carries the `dark` class, so
 * the registry theme sheet's `.dark` block (imported site-wide by
 * `../styles/global.ts`) declares the registry's default dark palette
 * directly on body - portal-mounted demo surfaces (dialogs, dropdowns,
 * toasts) append to body and inherit it, and the canvas paints it. This
 * sheet is the site palette overlay, registered on the `.docs-palette`
 * wrapper div every layout wraps its body content in (`scoped:
 * ".docs-palette"`): element-level declarations beat values inherited from
 * body regardless of registration order, so chrome, prose, and the landing
 * page resolve the site ladder while anything portaled to body keeps the
 * registry default. The accepted shift: the ⌘K `SearchPalette` portals to
 * body and renders the registry palette. The ui demo frames re-assert the
 * registry default themselves - `Component.astro` adds the `dark` class to
 * `.demo-frame`, so the theme sheet's `.dark` class block declares values
 * identical to body's directly on the frame, and the examples render
 * exactly what a dark-default registry install produces.
 * The `sidebar-*` family (unit 09) overrides the registry sidebar css
 * module's own dark-value registration (`packages/ui/registry/sidebar/`),
 * whose `.dark` block now reaches the wrapper inherited from `body.dark` -
 * without the override, static chrome composing the registry sidebar
 * vocabulary would render the registry values instead of the site ladder.
 * Values map the sidebar surfaces onto the site ladder per the current
 * chrome: aside `bg-base-300` → `--sidebar`, daisy menu hover/active →
 * `--base-50`, the rest alias the site tokens. Registered here rather than
 * in the chrome css module so the palette and its sidebar overrides
 * register as one sheet, scoped with the palette to `.docs-palette`.
 *
 * Layout metrics follow the palette: `--nav-w` (left rail/drawer width,
 * the old chrome's w-70), `--toc-w` (right rail clearance, lg:mr-80), and
 * `--navbar-h` (fixed navbar height the rails, anchors, and content clear)
 * are the chrome's structural dials — vars() so they read and change at a
 * glance, consumed as `tokens.navW` / `tokens.tocW` / `tokens.navbarH` by
 * Navbar, DocsNav, Toc, MainLayout, and global.ts.
 * Consume through `cssText()` for the static head styles (unit 08); the
 * exported `tokens` object maps each camelCase key to its `var(--*)`
 * reference (`base50` to `var(--base-50)`, digit-aware) for typed access
 * across the site's css/style maps - values inside the sheet keep
 * `var(--*)` literals because the const cannot reference itself during
 * initialization.
 */
import { vars } from "@hellajs/css";

export const tokens = vars({
  base50: "hsl(222.2 47.4% 14%)",
  base100: "hsl(222.2 47.4% 8%)",
  base200: "hsl(222.2 47.4% 7%)",
  base300: "hsl(222.2 47.4% 6%)",
  baseContrast: "oklch(97.807% 0.029 256.847)",
  primary: "#38EBFF",
  primaryForeground: "var(--base-300)",
  secondary: "var(--base-200)",
  secondaryForeground: "var(--base-contrast)",
  fontSans: "'Mulish Variable', sans-serif",
  fontMono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  background: "var(--base-100)",
  foreground: "var(--base-contrast)",
  card: "var(--base-300)",
  cardForeground: "var(--base-contrast)",
  popover: "var(--base-300)",
  popoverForeground: "var(--base-contrast)",
  muted: "var(--base-300)",
  mutedForeground: "oklch(0.708 0 0)",
  accent: "var(--base-300)",
  accentForeground: "var(--primary)",
  destructive: "oklch(0.704 0.191 22.216)",
  border: "oklch(37.2% 0.044 257.287)",
  input: "oklch(44.6% 0.043 257.281)",
  ring: "var(--primary)",
  radius: "0.625rem",
  sidebar: "var(--base-300)",
  sidebarForeground: "var(--foreground)",
  sidebarAccent: "var(--base-50)",
  sidebarAccentForeground: "var(--foreground)",
  sidebarPrimary: "var(--primary)",
  sidebarPrimaryForeground: "var(--primary-foreground)",
  sidebarBorder: "var(--border)",
  sidebarRing: "var(--ring)",
  navW: "17.5rem",
  tocW: "20rem",
  navbarH: "4rem",
}, { scoped: ".docs-palette" });

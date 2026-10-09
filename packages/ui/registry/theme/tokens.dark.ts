/**
 * Dark-default design tokens for the HellaJS registry components. Registers
 * the dark palette as custom properties on `:root` with no `.dark` remap:
 * apps selecting this sheet are dark-only and never toggle. It is selected
 * through `themeMode: "dark"` in hella.ui.json or `--theme-mode dark` on
 * `init`/`add`; the default `tokens.ts` keeps the light palette plus the
 * `.dark` class contract for togglable apps. The sheet is plain `:root` CSS
 * with no cascade wrapping, so your own overrides win the ordinary way:
 * import order or specificity.
 *
 * Add this file once per project through `bunx @hellajs/ui add theme` and
 * import it in the app entry before any styled component mounts. The
 * exported `tokens` object maps each camelCase key to its `var(--*)`
 * reference (`primaryForeground` to `var(--primary-foreground)`), and the
 * css-flavor style modules import it for typed token access; server
 * rendering collects the sheet through `cssText()`.
 */
import { vars } from "@hellajs/css";

export const tokens = vars({
  background: "oklch(0.145 0 0)",
  foreground: "oklch(0.985 0 0)",
  card: "oklch(0.205 0 0)",
  cardForeground: "oklch(0.985 0 0)",
  popover: "oklch(0.205 0 0)",
  popoverForeground: "oklch(0.985 0 0)",
  primary: "oklch(0.922 0 0)",
  primaryForeground: "oklch(0.205 0 0)",
  secondary: "oklch(0.269 0 0)",
  secondaryForeground: "oklch(0.985 0 0)",
  muted: "oklch(0.269 0 0)",
  mutedForeground: "oklch(0.708 0 0)",
  accent: "oklch(0.269 0 0)",
  accentForeground: "oklch(0.985 0 0)",
  destructive: "oklch(0.704 0.191 22.216)",
  border: "oklch(1 0 0 / 10%)",
  input: "oklch(1 0 0 / 15%)",
  ring: "oklch(0.556 0 0)",
  radius: "0.625rem",
});

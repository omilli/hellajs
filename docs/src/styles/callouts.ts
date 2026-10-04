/**
 * Docs-site callout styles (unit 11 of the site-foundation set). Static
 * mirror of the registry alert's chrome vocabulary — `base` and
 * `description` re-express `packages/ui/registry/alert/alert-css.ts`
 * value-for-value under site labels (the ui dist keeps those classes
 * module-private, so the site cannot import them; a mirror is the
 * docs-internal price of "semantic variants stay docs-site-internal").
 * Variant values port the compiled daisyUI looks of the 13 migrated
 * callouts (probe: dist/_astro CSS of the pre-exit build): `info` is the
 * `alert-info alert-soft` port (info tint over base-100), `error`/`warning`
 * are the solid `alert-error`/`alert-warning` ports. All three read the
 * daisyUI dark-theme oklch values the site rendered before the exit.
 * The registry alert's title chrome is not mirrored: no callout carries a
 * title today — add it alongside `calloutBody` when one does. Registered
 * unlayered like the other
 * site modules (site CSS outranks the registry's hella layer by cascade);
 * collected into the MainLayout head tag via `cssText()` — the Callout
 * component is imported by mdx content, which the layout renders during
 * frontmatter (Astro.slots.render), so registration precedes collection
 * on every page using one. Consumed by `docs/src/components/Callout.astro`.
 */
import { style } from "@hellajs/css";

export const calloutBase = style({
  alignItems: "start",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  boxSizing: "border-box",
  display: "grid",
  fontSize: "0.875rem",
  gridTemplateColumns: "0 1fr",
  lineHeight: "1.25rem",
  paddingBlock: "0.75rem",
  paddingInline: "1rem",
  position: "relative",
  rowGap: "0.125rem",
  width: "100%",
  "&:has(> svg)": {
    columnGap: "0.75rem",
    gridTemplateColumns: "1rem 1fr",
  },
  "& > svg": {
    color: "currentColor",
    height: "1rem",
    translate: "0 0.125rem",
    width: "1rem",
  },
}, { label: "site-callout" });

export const calloutBody = style({
  display: "grid",
  fontSize: "0.875rem",
  gap: "0.25rem",
  gridColumnStart: "2",
  justifyItems: "start",
  lineHeight: "1.25rem",
  "> p": { lineHeight: "1.625rem" },
}, { label: "site-callout-body" });

export const calloutVariants = {
  info: style({
    color: "oklch(74% .16 232.661)",
    backgroundColor: "color-mix(in oklab, oklch(74% .16 232.661) 8%, var(--base-100))",
    borderColor: "color-mix(in oklab, oklch(74% .16 232.661) 10%, var(--base-100))",
  }, { label: "site-callout-info" }),
  warning: style({
    color: "oklch(41% .112 45.904)",
    backgroundColor: "oklch(82% .189 84.429)",
    borderColor: "oklch(82% .189 84.429)",
  }, { label: "site-callout-warning" }),
  error: style({
    color: "oklch(27% .105 12.094)",
    backgroundColor: "oklch(71% .194 13.428)",
    borderColor: "oklch(71% .194 13.428)",
  }, { label: "site-callout-error" }),
};

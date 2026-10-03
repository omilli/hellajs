import { style } from "@hellajs/css";
import "@registry/theme/tokens.dark.js";

/**
 * Shared demo layout styles for the island wrappers in `docs/src/demos/`. The
 * kit owns the single dark-token import and the styles most wrappers repeat;
 * a wrapper keeps a local `style()` call only for a genuinely unique layout.
 *
 * Authoring rule: every demo export is a top-level `export default function`
 * / `export function` block — the View Code extractor
 * (`docs/src/utils/demo-code.ts`) slices exactly those blocks.
 */
/** Centers a column of demo content at the shared demo width. */
export const stack = style({
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  maxWidth: "26rem",
  width: "100%",
}, { label: "demo-stack" });

/** Centers a horizontal run of demo controls. */
export const row = style({
  alignItems: "center",
  display: "flex",
  gap: "0.5rem",
  justifyContent: "center",
}, { label: "demo-row" });

/** De-emphasizes helper text against the demo background. */
export const muted = style({
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  margin: 0,
}, { label: "demo-muted" });

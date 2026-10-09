import { style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

export const base = style("kbd", {
  alignItems: "center",
  backgroundColor: tokens.muted,
  borderRadius: `calc(${tokens.radius} * 0.6)`,
  boxSizing: "border-box",
  color: tokens.mutedForeground,
  display: "inline-flex",
  fontFamily: "var(--font-sans, ui-sans-serif, system-ui, sans-serif)",
  fontSize: "0.75rem",
  fontWeight: "500",
  gap: "0.25rem",
  height: "1.25rem",
  justifyContent: "center",
  lineHeight: "1rem",
  minWidth: "1.25rem",
  paddingInline: "0.25rem",
  pointerEvents: "none",
  userSelect: "none",
  width: "fit-content",
  "& svg:not([class*='size-'])": {
    height: "0.75rem",
    width: "0.75rem",
  },
  "&:is([data-slot='tooltip-content'] *)": {
    backgroundColor: `color-mix(in oklab, ${tokens.background} 20%, transparent)`,
    color: tokens.background,
  },
  "&:is([data-slot='tooltip-content'] *):is(.dark *)": {
    backgroundColor: `color-mix(in oklab, ${tokens.background} 10%, transparent)`,
  },
});

export const group = style("kbd-group", {
  alignItems: "center",
  display: "inline-flex",
  gap: "0.25rem",
});

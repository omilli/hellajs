import { style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

export const base = style("switch", {
  alignItems: "center",
  border: "1px solid transparent",
  borderRadius: "9999px",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  display: "inline-flex",
  flexShrink: "0",
  outlineStyle: "none",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&[data-size='default']": {
    height: "1.15rem",
    width: "2rem",
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    cursor: "not-allowed",
    opacity: "0.5",
  },
  "&[data-state='checked']": {
    backgroundColor: tokens.primary,
  },
  "&[data-state='unchecked']": {
    backgroundColor: tokens.input,
  },
  "&:is(.dark *)[data-state='unchecked']": {
    backgroundColor: `color-mix(in oklab, ${tokens.input} 80%, transparent)`,
  },
});

export const thumb = style("switch-thumb", {
  backgroundColor: tokens.background,
  borderRadius: "9999px",
  display: "block",
  height: "1rem",
  pointerEvents: "none",
  transition: "translate 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "1rem",
  "&[data-state='checked']": {
    translate: "calc(100% - 2px)",
  },
  "&[data-state='unchecked']": {
    translate: "0",
  },
  "&:is(.dark *)[data-state='checked']": {
    backgroundColor: tokens.primaryForeground,
  },
  "&:is(.dark *)[data-state='unchecked']": {
    backgroundColor: tokens.foreground,
  },
});

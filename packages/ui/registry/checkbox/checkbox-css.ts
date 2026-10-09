import { style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

export const base = style("checkbox", {
  boxSizing: "border-box",
  borderRadius: "4px",
  border: `1px solid ${tokens.input}`,
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  flexShrink: "0",
  height: "1rem",
  outlineStyle: "none",
  transition: "box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "1rem",
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    cursor: "not-allowed",
    opacity: "0.5",
  },
  "&[aria-invalid='true']": {
    borderColor: tokens.destructive,
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:is(.dark *)": {
    backgroundColor: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
  },
  "&[data-state='checked']": {
    backgroundColor: tokens.primary,
    borderColor: tokens.primary,
    color: tokens.primaryForeground,
  },
  "&:is(.dark *)[data-state='checked']": {
    backgroundColor: tokens.primary,
  },
});

export const indicator = style("checkbox-indicator", {
  color: "currentColor",
  display: "grid",
  placeContent: "center",
  transition: "none",
});

export const icon = style("checkbox-icon", {
  height: "0.875rem",
  width: "0.875rem",
});

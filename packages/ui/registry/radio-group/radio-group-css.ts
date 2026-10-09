import { style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

export const base = style("radio-group", {
  display: "grid",
  gap: "0.75rem",
});

export const item = style("radio-group-item", {
  aspectRatio: "1 / 1",
  border: `1px solid ${tokens.input}`,
  borderRadius: "9999px",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  boxSizing: "border-box",
  color: tokens.primary,
  flexShrink: "0",
  height: "1rem",
  outlineStyle: "none",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
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
});

export const indicator = style("radio-group-indicator", {
  alignItems: "center",
  display: "flex",
  justifyContent: "center",
  position: "relative",
});

export const icon = style("radio-group-icon", {
  fill: tokens.primary,
  height: "0.5rem",
  left: "50%",
  position: "absolute",
  top: "50%",
  translate: "-50% -50%",
  width: "0.5rem",
});

export const row = style("radio-group-row", {
  alignItems: "center",
  display: "flex",
  gap: "0.5rem",
});

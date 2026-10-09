import { style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

export const wrapper = style("native-select-wrapper", {
  position: "relative",
  width: "fit-content",
  "&:has(select:disabled)": {
    opacity: "0.5",
  },
});

export const base = style("native-select", {
  appearance: "none",
  border: `1px solid ${tokens.input}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  fontSize: "0.875rem",
  height: "2.25rem",
  lineHeight: "1.25rem",
  minWidth: "0",
  outlineStyle: "none",
  paddingBlock: "0.5rem",
  paddingLeft: "0.75rem",
  paddingRight: "2.25rem",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "100%",
  "&::placeholder": {
    color: tokens.mutedForeground,
  },
  "&::selection": {
    backgroundColor: tokens.primary,
    color: tokens.primaryForeground,
  },
  "&:disabled": {
    cursor: "not-allowed",
    pointerEvents: "none",
  },
  "&[data-size='sm']": {
    height: "2rem",
    paddingBlock: "0.25rem",
  },
  "&:is(.dark *)": {
    background: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
  },
  "&:is(.dark *):hover": {
    background: `color-mix(in oklab, ${tokens.input} 50%, transparent)`,
  },
});

export const focus = style("native-select-focus", {
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
});

export const invalid = style("native-select-invalid", {
  "&[aria-invalid='true']": {
    borderColor: tokens.destructive,
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 20%, transparent)`,
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
  },
});

export const icon = style("native-select-icon", {
  color: tokens.mutedForeground,
  height: "1rem",
  opacity: "0.5",
  pointerEvents: "none",
  position: "absolute",
  right: "0.875rem",
  top: "50%",
  transform: "translateY(-50%)",
  userSelect: "none",
  width: "1rem",
});

export const option = style("native-select-option", {
  backgroundColor: "Canvas",
  color: "CanvasText",
});

export const optgroup = style("native-select-optgroup", {
  backgroundColor: "Canvas",
  color: "CanvasText",
});

import { style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

export const base = style("toggle-group", {
  alignItems: "center",
  borderRadius: tokens.radius,
  boxSizing: "border-box",
  display: "flex",
  gap: "0",
  width: "fit-content",
});

export const variants = {
  default: style("toggle-group-default", {
    backgroundColor: "transparent",
  }),
  outline: style("toggle-group-outline", {
    background: "transparent",
    border: `1px solid ${tokens.input}`,
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "&:hover": {
      backgroundColor: tokens.accent,
      color: tokens.accentForeground,
    },
  }),
};

export const sizes = {
  default: style("toggle-group-size-default", {
    height: "2.25rem",
    minWidth: "2.25rem",
    paddingInline: "0.5rem",
  }),
  sm: style("toggle-group-size-sm", {
    height: "2rem",
    minWidth: "2rem",
    paddingInline: "0.375rem",
  }),
  lg: style("toggle-group-size-lg", {
    height: "2.5rem",
    minWidth: "2.5rem",
    paddingInline: "0.625rem",
  }),
};

export const item = style("toggle-group-item", {
  minWidth: "0",
  paddingInline: "0.75rem",
  width: "auto",
  "&:focus": {
    zIndex: "10",
  },
  "&:focus-visible": {
    zIndex: "10",
  },
  "&:first-child": {
    borderBottomLeftRadius: `calc(${tokens.radius} * 0.8)`,
    borderTopLeftRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "&:last-child": {
    borderBottomRightRadius: `calc(${tokens.radius} * 0.8)`,
    borderTopRightRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "&[data-variant='outline']": {
    borderLeftWidth: "0",
  },
  "&[data-variant='outline']:first-child": {
    borderLeftWidth: "1px",
  },
  borderRadius: "0",
  boxShadow: "none",
  flexShrink: "0",
});

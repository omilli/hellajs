import { style } from "@hellajs/css";

export const base = style({
  alignItems: "center",
  borderRadius: "var(--radius)",
  boxSizing: "border-box",
  display: "flex",
  gap: "0",
  width: "fit-content",
}, { label: "toggle-group" });

export const variants = {
  default: style({
    backgroundColor: "transparent",
  }, { label: "toggle-group-default" }),
  outline: style({
    background: "transparent",
    border: "1px solid var(--input)",
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
  }, { label: "toggle-group-outline" }),
};

export const sizes = {
  default: style({
    height: "2.25rem",
    minWidth: "2.25rem",
    paddingInline: "0.5rem",
  }, { label: "toggle-group-size-default" }),
  sm: style({
    height: "2rem",
    minWidth: "2rem",
    paddingInline: "0.375rem",
  }, { label: "toggle-group-size-sm" }),
  lg: style({
    height: "2.5rem",
    minWidth: "2.5rem",
    paddingInline: "0.625rem",
  }, { label: "toggle-group-size-lg" }),
};

export const item = style({
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
    borderBottomLeftRadius: "calc(var(--radius) * 0.8)",
    borderTopLeftRadius: "calc(var(--radius) * 0.8)",
  },
  "&:last-child": {
    borderBottomRightRadius: "calc(var(--radius) * 0.8)",
    borderTopRightRadius: "calc(var(--radius) * 0.8)",
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
}, { label: "toggle-group-item" });

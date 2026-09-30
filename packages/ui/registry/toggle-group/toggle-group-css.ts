import { style } from "@hellajs/css";

export const base = style({
  alignItems: "center",
  borderRadius: "var(--radius)",
  boxSizing: "border-box",
  display: "flex",
  gap: "0",
  width: "fit-content",
}, { label: "hella-toggle-group", layer: "hella" });

export const variants = {
  default: style({
    backgroundColor: "transparent",
  }, { label: "hella-toggle-group-default", layer: "hella" }),
  outline: style({
    background: "transparent",
    border: "1px solid var(--input)",
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
  }, { label: "hella-toggle-group-outline", layer: "hella" }),
};

export const sizes = {
  default: style({
    height: "2.25rem",
    minWidth: "2.25rem",
    paddingInline: "0.5rem",
  }, { label: "hella-toggle-group-size-default", layer: "hella" }),
  sm: style({
    height: "2rem",
    minWidth: "2rem",
    paddingInline: "0.375rem",
  }, { label: "hella-toggle-group-size-sm", layer: "hella" }),
  lg: style({
    height: "2.5rem",
    minWidth: "2.5rem",
    paddingInline: "0.625rem",
  }, { label: "hella-toggle-group-size-lg", layer: "hella" }),
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
}, { label: "hella-toggle-group-item", layer: "hella" });

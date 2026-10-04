import { style } from "@hellajs/css";

export const base = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxSizing: "border-box",
  display: "inline-flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "&:hover": {
    backgroundColor: "var(--muted)",
    color: "var(--muted-foreground)",
  },
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
  "&[data-state='on']": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
}, { label: "toggle" });

export const variants = {
  default: style({
    backgroundColor: "transparent",
  }, { label: "toggle-default" }),
  outline: style({
    background: "transparent",
    border: "1px solid var(--input)",
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "&:hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
  }, { label: "toggle-outline" }),
};

export const sizes = {
  default: style({
    height: "2.25rem",
    minWidth: "2.25rem",
    paddingInline: "0.5rem",
  }, { label: "toggle-size-default" }),
  sm: style({
    height: "2rem",
    minWidth: "2rem",
    paddingInline: "0.375rem",
  }, { label: "toggle-size-sm" }),
  lg: style({
    height: "2.5rem",
    minWidth: "2.5rem",
    paddingInline: "0.625rem",
  }, { label: "toggle-size-lg" }),
};

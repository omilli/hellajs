import { style } from "@hellajs/css";

export const base = style({
  alignItems: "center",
  border: "1px solid transparent",
  borderRadius: "calc(infinity * 1px)",
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: "0",
  fontSize: "0.75rem",
  fontWeight: "500",
  gap: "0.25rem",
  justifyContent: "center",
  lineHeight: "1rem",
  overflow: "hidden",
  paddingBlock: "0.125rem",
  paddingInline: "0.5rem",
  transitionDuration: "150ms",
  transitionProperty: "color, box-shadow",
  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  width: "fit-content",
  "& > svg": {
    height: "0.75rem",
    pointerEvents: "none",
    width: "0.75rem",
  },
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:is(.dark *)[aria-invalid='true']": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
}, { label: "hella-badge", layer: "hella" });

export const variants = {
  default: style({
    backgroundColor: "var(--primary)",
    color: "var(--primary-foreground)",
    "&:is(a):hover": {
      backgroundColor: "color-mix(in oklab, var(--primary) 90%, transparent)",
    },
  }, { label: "hella-badge-default", layer: "hella" }),
  secondary: style({
    backgroundColor: "var(--secondary)",
    color: "var(--secondary-foreground)",
    "&:is(a):hover": {
      backgroundColor: "color-mix(in oklab, var(--secondary) 90%, transparent)",
    },
  }, { label: "hella-badge-secondary", layer: "hella" }),
  destructive: style({
    backgroundColor: "var(--destructive)",
    color: "#fff",
    "&:focus-visible": {
      boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
    },
    "&:is(.dark *)": {
      backgroundColor: "color-mix(in oklab, var(--destructive) 60%, transparent)",
    },
    "&:is(.dark *):focus-visible": {
      boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
    },
    "&:is(a):hover": {
      backgroundColor: "color-mix(in oklab, var(--destructive) 90%, transparent)",
    },
  }, { label: "hella-badge-destructive", layer: "hella" }),
  outline: style({
    borderColor: "var(--border)",
    color: "var(--foreground)",
    "&:is(a):hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
  }, { label: "hella-badge-outline", layer: "hella" }),
  ghost: style({
    "&:is(a):hover": {
      backgroundColor: "var(--accent)",
      color: "var(--accent-foreground)",
    },
  }, { label: "hella-badge-ghost", layer: "hella" }),
  link: style({
    color: "var(--primary)",
    textUnderlineOffset: "4px",
    "&:is(a):hover": {
      textDecorationLine: "underline",
    },
  }, { label: "hella-badge-link", layer: "hella" }),
};

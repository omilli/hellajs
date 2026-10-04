import { style } from "@hellajs/css";

export const base = style({
  alignItems: "start",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  boxSizing: "border-box",
  display: "grid",
  fontSize: "0.875rem",
  gridTemplateColumns: "0 1fr",
  lineHeight: "1.25rem",
  paddingBlock: "0.75rem",
  paddingInline: "1rem",
  position: "relative",
  rowGap: "0.125rem",
  width: "100%",
  "&:has(> svg)": {
    columnGap: "0.75rem",
    gridTemplateColumns: "1rem 1fr",
  },
  "& > svg": {
    color: "currentColor",
    height: "1rem",
    translate: "0 0.125rem",
    width: "1rem",
  },
}, { label: "alert" });

export const variants = {
  default: style({
    backgroundColor: "var(--card)",
    color: "var(--card-foreground)",
  }, { label: "alert-default" }),
  destructive: style({
    backgroundColor: "var(--card)",
    color: "var(--destructive)",
    "& > [data-slot='alert-description']": {
      color: "color-mix(in oklab, var(--destructive) 90%, transparent)",
    },
    "& > svg": {
      color: "currentColor",
    },
  }, { label: "alert-destructive" }),
};

export const title = style({
  display: "-webkit-box",
  fontWeight: "500",
  gridColumnStart: "2",
  letterSpacing: "-0.025em",
  lineHeight: "1.25rem",
  minHeight: "1rem",
  overflow: "clip",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: "1",
}, { label: "alert-title" });

export const description = style({
  color: "var(--muted-foreground)",
  display: "grid",
  fontSize: "0.875rem",
  gap: "0.25rem",
  gridColumnStart: "2",
  justifyItems: "start",
  lineHeight: "1.25rem",
  "& p": {
    lineHeight: "1.625rem",
  },
}, { label: "alert-description" });

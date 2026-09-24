import { style } from "@hellajs/css";

export const base = style({
  alignItems: "center",
  borderStyle: "dashed",
  borderRadius: "var(--radius)",
  boxSizing: "border-box",
  display: "flex",
  flex: "1",
  flexDirection: "column",
  gap: "1.5rem",
  justifyContent: "center",
  minWidth: "0",
  paddingBlock: "1.5rem",
  paddingInline: "1.5rem",
  textAlign: "center",
  textWrap: "balance",
  "@media (min-width: 48rem)": {
    paddingBlock: "3rem",
    paddingInline: "3rem",
  },
}, { label: "hella-empty", layer: "hella" });

export const header = style({
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  maxWidth: "24rem",
  textAlign: "center",
}, { label: "hella-empty-header", layer: "hella" });

export const media = style({
  alignItems: "center",
  display: "flex",
  flexShrink: "0",
  justifyContent: "center",
  marginBottom: "0.5rem",
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
}, { label: "hella-empty-media", layer: "hella" });

export const mediaVariants = {
  default: style({
    backgroundColor: "transparent",
  }, { label: "hella-empty-media-default", layer: "hella" }),
  icon: style({
    alignItems: "center",
    backgroundColor: "var(--muted)",
    borderRadius: "var(--radius)",
    color: "var(--foreground)",
    display: "flex",
    flexShrink: "0",
    height: "2.5rem",
    justifyContent: "center",
    width: "2.5rem",
    "& svg:not([class*='size-'])": {
      height: "1.5rem",
      width: "1.5rem",
    },
  }, { label: "hella-empty-media-icon", layer: "hella" }),
};

export const title = style({
  fontSize: "1.125rem",
  fontWeight: "500",
  letterSpacing: "-0.025em",
  lineHeight: "1.75rem",
}, { label: "hella-empty-title", layer: "hella" });

export const description = style({
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  lineHeight: "1.625rem",
  "& > a": {
    textDecorationLine: "underline",
    textUnderlineOffset: "4px",
  },
  "& > a:hover": {
    color: "var(--primary)",
  },
}, { label: "hella-empty-description", layer: "hella" });

export const content = style({
  alignItems: "center",
  display: "flex",
  flexDirection: "column",
  fontSize: "0.875rem",
  gap: "1rem",
  lineHeight: "1.25rem",
  maxWidth: "24rem",
  minWidth: "0",
  textAlign: "center",
  textWrap: "balance",
  width: "100%",
}, { label: "hella-empty-content", layer: "hella" });

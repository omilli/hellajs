import { css, style } from "@hellajs/css";

export const base = style({
  alignItems: "center",
  color: "var(--muted-foreground)",
  columnGap: "0.5rem",
  display: "flex",
  minHeight: "1rem",
  position: "relative",
  textAlign: "left",
  width: "100%",
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "& a": {
    textDecorationLine: "underline",
    textUnderlineOffset: "3px",
  },
  "& a:hover": {
    color: "var(--foreground)",
  },
}, { label: "hella-marker", layer: "hella" });

export const variants: Record<string, string> = {
  separator: style({
    "&::before": {
      backgroundColor: "var(--border)",
      flex: "1 1 0%",
      height: "1px",
      marginRight: "0.25rem",
      minWidth: "0",
    },
    "&::after": {
      backgroundColor: "var(--border)",
      flex: "1 1 0%",
      height: "1px",
      marginLeft: "0.25rem",
      minWidth: "0",
    },
  }, { label: "hella-marker-separator", layer: "hella" }),
  border: style({
    borderBottom: "1px solid var(--border)",
    paddingBottom: "0.5rem",
  }, { label: "hella-marker-border", layer: "hella" }),
};

export const icon = style({
  flexShrink: "0",
  height: "1rem",
  width: "1rem",
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
}, { label: "hella-marker-icon", layer: "hella" });

export const content = style({
  minWidth: "0",
  overflowWrap: "break-word",
  "& a": {
    textDecorationLine: "underline",
    textUnderlineOffset: "3px",
  },
  "& a:hover": {
    color: "var(--foreground)",
  },
}, { label: "hella-marker-content", layer: "hella" });

css({
  "@layer hella": {
    "[data-slot='marker'][data-variant='separator'] [data-slot='marker-content']": {
      flex: "none",
      textAlign: "center",
    },
  },
});

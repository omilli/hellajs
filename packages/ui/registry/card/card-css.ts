import { css, style } from "@hellajs/css";

export const base = style({
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "calc(var(--radius) * 1.4)",
  color: "var(--card-foreground)",
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
  paddingBlock: "1.5rem",
  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
}, { label: "hella-card", layer: "hella" });

export const header = style({
  alignItems: "start",
  container: "card-header / inline-size",
  display: "grid",
  gap: "0.5rem",
  gridAutoRows: "min-content",
  gridTemplateRows: "auto auto",
  paddingInline: "1.5rem",
  "&:has([data-slot='card-action'])": {
    gridTemplateColumns: "1fr auto",
  },
}, { label: "hella-card-header", layer: "hella" });

export const title = style({
  fontWeight: "600",
  lineHeight: "1",
}, { label: "hella-card-title", layer: "hella" });

export const description = style({
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
}, { label: "hella-card-description", layer: "hella" });

export const action = style({
  gridColumnStart: "2",
  gridRowEnd: "span 2",
  gridRowStart: "1",
  justifySelf: "end",
  alignSelf: "start",
}, { label: "hella-card-action", layer: "hella" });

export const content = style({
  paddingInline: "1.5rem",
}, { label: "hella-card-content", layer: "hella" });

export const footer = style({
  alignItems: "center",
  display: "flex",
  paddingInline: "1.5rem",
}, { label: "hella-card-footer", layer: "hella" });

// The `[.border-b]` / `[.border-t]` arbitrary variants match an ancestor or
// previous sibling carrying the class - ancestor/sibling selectors the
// class-scoped style() nesting cannot express, so they register as raw
// attribute selectors inside the same layer.
css({
  "@layer hella": {
    ".border-b [data-slot='card-header'], .border-b ~ [data-slot='card-header']": {
      paddingBottom: "1.5rem",
    },
    ".border-t [data-slot='card-footer'], .border-t ~ [data-slot='card-footer']": {
      paddingTop: "1.5rem",
    },
  },
});

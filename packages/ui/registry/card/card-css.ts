import { css, style } from "@hellajs/css";

export const base = style("card", {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: "calc(var(--radius) * 1.4)",
  color: "var(--card-foreground)",
  display: "flex",
  flexDirection: "column",
  gap: "1.5rem",
  paddingBlock: "1.5rem",
  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
});

export const header = style("card-header", {
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
});

export const title = style("card-title", {
  fontWeight: "600",
  lineHeight: "1",
});

export const description = style("card-description", {
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
});

export const action = style("card-action", {
  gridColumnStart: "2",
  gridRowEnd: "span 2",
  gridRowStart: "1",
  justifySelf: "end",
  alignSelf: "start",
});

export const content = style("card-content", {
  paddingInline: "1.5rem",
});

export const footer = style("card-footer", {
  alignItems: "center",
  display: "flex",
  paddingInline: "1.5rem",
});

css({
  ".border-b [data-slot='card-header'], .border-b ~ [data-slot='card-header']": {
    paddingBottom: "1.5rem",
  },
  ".border-t [data-slot='card-footer'], .border-t ~ [data-slot='card-footer']": {
    paddingTop: "1.5rem",
  },
});

import { style } from "@hellajs/css";

export const container = style({
  overflowX: "auto",
  position: "relative",
  width: "100%",
}, { label: "table-container" });

export const base = style({
  captionSide: "bottom",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  width: "100%",
}, { label: "table" });

export const header = style({
  "& tr": {
    borderBottom: "1px solid var(--border)",
  },
}, { label: "table-header" });

export const body = style({
  "& tr:last-child": {
    borderBottom: "0",
  },
}, { label: "table-body" });

export const footer = style({
  backgroundColor: "color-mix(in oklab, var(--muted) 50%, transparent)",
  borderTop: "1px solid var(--border)",
  fontWeight: "500",
  "& > tr:last-child": {
    borderBottom: "0",
  },
}, { label: "table-footer" });

export const row = style({
  borderBottom: "1px solid var(--border)",
  transitionProperty: "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
  transitionDuration: "150ms",
  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    backgroundColor: "color-mix(in oklab, var(--muted) 50%, transparent)",
  },
  "&:has([aria-expanded='true'])": {
    backgroundColor: "color-mix(in oklab, var(--muted) 50%, transparent)",
  },
  "&[data-state='selected']": {
    backgroundColor: "var(--muted)",
  },
}, { label: "table-row" });

export const head = style({
  color: "var(--foreground)",
  fontWeight: "500",
  height: "2.5rem",
  paddingInline: "0.5rem",
  textAlign: "left",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
  "&:has([role='checkbox'])": {
    paddingRight: "0",
  },
  "& > [role='checkbox']": {
    transform: "translateY(2px)",
  },
}, { label: "table-head" });

export const cell = style({
  padding: "0.5rem",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
  "&:has([role='checkbox'])": {
    paddingRight: "0",
  },
  "& > [role='checkbox']": {
    transform: "translateY(2px)",
  },
}, { label: "table-cell" });

export const caption = style({
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  marginTop: "1rem",
}, { label: "table-caption" });

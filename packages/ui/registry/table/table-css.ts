import { style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

export const container = style("table-container", {
  overflowX: "auto",
  position: "relative",
  width: "100%",
});

export const base = style("table", {
  captionSide: "bottom",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  width: "100%",
});

export const header = style("table-header", {
  "& tr": {
    borderBottom: `1px solid ${tokens.border}`,
  },
});

export const body = style("table-body", {
  "& tr:last-child": {
    borderBottom: "0",
  },
});

export const footer = style("table-footer", {
  backgroundColor: `color-mix(in oklab, ${tokens.muted} 50%, transparent)`,
  borderTop: `1px solid ${tokens.border}`,
  fontWeight: "500",
  "& > tr:last-child": {
    borderBottom: "0",
  },
});

export const row = style("table-row", {
  borderBottom: `1px solid ${tokens.border}`,
  transitionProperty: "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
  transitionDuration: "150ms",
  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    backgroundColor: `color-mix(in oklab, ${tokens.muted} 50%, transparent)`,
  },
  "&:has([aria-expanded='true'])": {
    backgroundColor: `color-mix(in oklab, ${tokens.muted} 50%, transparent)`,
  },
  "&[data-state='selected']": {
    backgroundColor: tokens.muted,
  },
});

export const head = style("table-head", {
  color: tokens.foreground,
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
});

export const cell = style("table-cell", {
  padding: "0.5rem",
  verticalAlign: "middle",
  whiteSpace: "nowrap",
  "&:has([role='checkbox'])": {
    paddingRight: "0",
  },
  "& > [role='checkbox']": {
    transform: "translateY(2px)",
  },
});

export const caption = style("table-caption", {
  color: tokens.mutedForeground,
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  marginTop: "1rem",
});

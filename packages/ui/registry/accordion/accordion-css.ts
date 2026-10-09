import { style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

export const item = style("accordion-item", {
  borderBottom: `1px solid ${tokens.border}`,
  "&:last-child": {
    borderBottom: "0",
  },
});

export const header = style("accordion-header", {
  display: "flex",
});

export const trigger = style("accordion-trigger", {
  alignItems: "flex-start",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  display: "flex",
  flex: "1",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "1rem",
  justifyContent: "space-between",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  paddingBlock: "1rem",
  textAlign: "left",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    textDecorationLine: "underline",
  },
  "&:focus-visible": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[data-state='open'] > svg": {
    rotate: "180deg",
  },
});

export const icon = style("accordion-icon", {
  color: tokens.mutedForeground,
  flexShrink: "0",
  height: "1rem",
  pointerEvents: "none",
  translate: "0 0.125rem",
  transition: "rotate 200ms cubic-bezier(0.4, 0, 0.2, 1), translate 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "1rem",
});

export const content = style("accordion-content", {
  display: "grid",
  fontSize: "0.875rem",
  gridTemplateRows: "0fr",
  lineHeight: "1.25rem",
  opacity: "0",
  transition: "grid-template-rows 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&[data-state='open']": {
    gridTemplateRows: "1fr",
    opacity: "1",
  },
});

export const contentInner = style("accordion-content-inner", {
  minHeight: "0",
  overflow: "hidden",
  paddingBottom: "0",
  paddingTop: "0",
  transition: "padding-bottom 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&[data-state='open']": {
    paddingBottom: "1rem",
  },
});

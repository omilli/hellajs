import { style } from "@hellajs/css";

export const base = "";

export const item = style({
  borderBottom: "1px solid var(--border)",
  "&:last-child": {
    borderBottom: "0",
  },
}, { label: "hella-accordion-item", layer: "hella" });

export const header = style({
  display: "flex",
}, { label: "hella-accordion-header", layer: "hella" });

export const trigger = style({
  alignItems: "flex-start",
  borderRadius: "calc(var(--radius) * 0.8)",
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
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[data-state='open'] > svg": {
    rotate: "180deg",
  },
}, { label: "hella-accordion-trigger", layer: "hella" });

export const icon = style({
  color: "var(--muted-foreground)",
  flexShrink: "0",
  height: "1rem",
  pointerEvents: "none",
  translate: "0 0.125rem",
  transition: "rotate 200ms cubic-bezier(0.4, 0, 0.2, 1), translate 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "1rem",
}, { label: "hella-accordion-icon", layer: "hella" });

// The ref's animate-accordion-up/down keyframes animate a measured height
// custom property; this port animates the same 200ms window through the
// measurement-free grid-rows technique instead (both flavors). The inner
// mirrors data-state so its padding flips with the rows: a static
// padding-bottom floors the collapsing item's box, reserving dead space
// under every closed item (the 0fr row cannot shrink past it).
export const content = style({
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
}, { label: "hella-accordion-content", layer: "hella" });

export const contentInner = style({
  minHeight: "0",
  overflow: "hidden",
  paddingBottom: "0",
  paddingTop: "0",
  transition: "padding-bottom 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&[data-state='open']": {
    paddingBottom: "1rem",
  },
}, { label: "hella-accordion-content-inner", layer: "hella" });

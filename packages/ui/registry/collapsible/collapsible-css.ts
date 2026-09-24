import { style } from "@hellajs/css";

export const base = "";

export const trigger = style({
  "&[data-state='open'] > svg": {
    rotate: "180deg",
  },
}, { label: "hella-collapsible-trigger", layer: "hella" });

export const icon = style({
  color: "var(--muted-foreground)",
  flexShrink: "0",
  height: "1rem",
  pointerEvents: "none",
  translate: "0 0.125rem",
  transition: "rotate 200ms cubic-bezier(0.4, 0, 0.2, 1), translate 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "1rem",
}, { label: "hella-collapsible-icon", layer: "hella" });

// The shadcn accordion keyframes collapse/expand by animating a measured
// height custom property; this port animates the same 200ms window through
// the measurement-free grid-rows technique instead (both flavors).
export const content = style({
  display: "grid",
  gridTemplateRows: "0fr",
  opacity: "0",
  transition: "grid-template-rows 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&[data-state='open']": {
    gridTemplateRows: "1fr",
    opacity: "1",
  },
}, { label: "hella-collapsible-content", layer: "hella" });

export const contentInner = style({
  minHeight: "0",
  overflow: "hidden",
}, { label: "hella-collapsible-content-inner", layer: "hella" });

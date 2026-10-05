import { style } from "@hellajs/css";

export const trigger = style("collapsible-trigger", {
  alignItems: "center",
  display: "inline-flex",
  gap: "0.5rem",
  "&[data-state='open'] > svg": {
    rotate: "180deg",
  },
});

export const icon = style("collapsible-icon", {
  color: "var(--muted-foreground)",
  flexShrink: "0",
  height: "1rem",
  pointerEvents: "none",
  translate: "0 0.125rem",
  transition: "rotate 200ms cubic-bezier(0.4, 0, 0.2, 1), translate 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "1rem",
});

export const content = style("collapsible-content", {
  display: "grid",
  gridTemplateRows: "0fr",
  opacity: "0",
  transition: "grid-template-rows 200ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&[data-state='open']": {
    gridTemplateRows: "1fr",
    opacity: "1",
  },
});

export const contentInner = style("collapsible-content-inner", {
  minHeight: "0",
  overflow: "hidden",
});

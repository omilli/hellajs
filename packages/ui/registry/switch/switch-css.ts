import { style } from "@hellajs/css";

// The ref's size prop pins to "default" in this port (data-size="default"), so
// the data-[size=sm] branches are tailwind-only: they can never match here and
// have no css-flavor translation.
export const base = style({
  alignItems: "center",
  border: "1px solid transparent",
  borderRadius: "9999px",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  display: "inline-flex",
  flexShrink: "0",
  outlineStyle: "none",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&[data-size='default']": {
    height: "1.15rem",
    width: "2rem",
  },
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:disabled": {
    cursor: "not-allowed",
    opacity: "0.5",
  },
  "&[data-state='checked']": {
    backgroundColor: "var(--primary)",
  },
  "&[data-state='unchecked']": {
    backgroundColor: "var(--input)",
  },
  "&:is(.dark *)[data-state='unchecked']": {
    backgroundColor: "color-mix(in oklab, var(--input) 80%, transparent)",
  },
}, { label: "hella-switch", layer: "hella" });

// The thumb's default size comes from the root's data-size="default" group
// condition (ref: group-data-[size=default]/switch:size-4). ring-0 is a
// tailwind ring-machinery width reset with no visual effect; the css flavor
// omits it. The translate drives the whole state motion.
export const thumb = style({
  backgroundColor: "var(--background)",
  borderRadius: "9999px",
  display: "block",
  height: "1rem",
  pointerEvents: "none",
  transition: "translate 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "1rem",
  "&[data-state='checked']": {
    translate: "calc(100% - 2px)",
  },
  "&[data-state='unchecked']": {
    translate: "0",
  },
  "&:is(.dark *)[data-state='checked']": {
    backgroundColor: "var(--primary-foreground)",
  },
  "&:is(.dark *)[data-state='unchecked']": {
    backgroundColor: "var(--foreground)",
  },
}, { label: "hella-switch-thumb", layer: "hella" });

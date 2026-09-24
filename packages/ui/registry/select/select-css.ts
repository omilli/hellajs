import { keyframes, style } from "@hellajs/css";

// tw-animate-css equivalents, hand-rolled: the enter composes fade +
// zoom(95%) with the side's slide direction (named by the data-side value
// that applies it), the exit is fade + zoom without slide.
const inTop = keyframes({ from: { opacity: "0", transform: "translateY(0.5rem) scale(0.95)" } });
const inBottom = keyframes({ from: { opacity: "0", transform: "translateY(-0.5rem) scale(0.95)" } });
const inLeft = keyframes({ from: { opacity: "0", transform: "translateX(0.5rem) scale(0.95)" } });
const inRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

export const base = style({
  alignItems: "center",
  backgroundColor: "transparent",
  border: "1px solid var(--input)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  justifyContent: "space-between",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  paddingBlock: "0.5rem",
  paddingInline: "0.75rem",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  width: "fit-content",
  "&[data-placeholder]": {
    color: "var(--muted-foreground)",
  },
  "&[data-size='default']": {
    height: "2.25rem",
  },
  "&[data-size='sm']": {
    height: "2rem",
  },
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05), 0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:disabled": {
    cursor: "not-allowed",
    opacity: "0.5",
  },
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05), 0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "& > [data-slot='select-value']": {
    alignItems: "center",
    display: "flex",
    gap: "0.5rem",
    lineClamp: "1",
    overflow: "hidden",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "& svg:not([class*='text-'])": {
    color: "var(--muted-foreground)",
  },
  "&:is(.dark *)": {
    background: "color-mix(in oklab, var(--input) 30%, transparent)",
  },
  "&:is(.dark *):hover": {
    background: "color-mix(in oklab, var(--input) 50%, transparent)",
  },
  "&:is(.dark *)[aria-invalid='true']": {
    boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05), 0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
}, { label: "hella-select-trigger", layer: "hella" });

export const value = "";

export const content = style({
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  color: "var(--popover-foreground)",
  maxHeight: "var(--radix-select-content-available-height)",
  minWidth: "8rem",
  overflowX: "hidden",
  overflowY: "auto",
  position: "relative",
  transformOrigin: "var(--radix-select-content-transform-origin)",
  zIndex: "50",
  "&[data-side='bottom']": {
    translate: "0 0.25rem",
  },
  "&[data-side='left']": {
    translate: "-0.25rem 0",
  },
  "&[data-side='right']": {
    translate: "0.25rem 0",
  },
  "&[data-side='top']": {
    translate: "0 -0.25rem",
  },
  "&[data-state='open'][data-side='top']": {
    animation: `${inTop} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='bottom']": {
    animation: `${inBottom} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='left']": {
    animation: `${inLeft} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='right']": {
    animation: `${inRight} 150ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${out} 150ms ease-in both`,
  },
}, { label: "hella-select-content", layer: "hella" });

export const viewport = style({
  height: "var(--radix-select-trigger-height)",
  minWidth: "var(--radix-select-trigger-width)",
  padding: "0.25rem",
  scrollPaddingBlock: "0.25rem",
  width: "100%",
}, { label: "hella-select-viewport", layer: "hella" });

export const group = "";

export const item = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.6)",
  cursor: "default",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  paddingBlock: "0.375rem",
  paddingLeft: "0.5rem",
  paddingRight: "2rem",
  position: "relative",
  userSelect: "none",
  width: "100%",
  "&:focus": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&[data-disabled]": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "& > span:last-child": {
    alignItems: "center",
    display: "flex",
    gap: "0.5rem",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "& svg:not([class*='text-'])": {
    color: "var(--muted-foreground)",
  },
}, { label: "hella-select-item", layer: "hella" });

export const indicator = style({
  alignItems: "center",
  display: "flex",
  height: "0.875rem",
  justifyContent: "center",
  position: "absolute",
  right: "0.5rem",
  width: "0.875rem",
}, { label: "hella-select-indicator", layer: "hella" });

export const icon = style({
  height: "1rem",
  width: "1rem",
}, { label: "hella-select-icon", layer: "hella" });

export const chevron = style({
  height: "1rem",
  opacity: "0.5",
  width: "1rem",
}, { label: "hella-select-chevron", layer: "hella" });

export const label = style({
  color: "var(--muted-foreground)",
  fontSize: "0.75rem",
  lineHeight: "1rem",
  paddingBlock: "0.375rem",
  paddingInline: "0.5rem",
}, { label: "hella-select-label", layer: "hella" });

export const separator = style({
  backgroundColor: "var(--border)",
  height: "1px",
  marginBlock: "0.25rem",
  marginInline: "-0.25rem",
  pointerEvents: "none",
}, { label: "hella-select-separator", layer: "hella" });

export const scrollButton = style({
  alignItems: "center",
  cursor: "default",
  display: "flex",
  justifyContent: "center",
  paddingBlock: "0.25rem",
}, { label: "hella-select-scroll-button", layer: "hella" });

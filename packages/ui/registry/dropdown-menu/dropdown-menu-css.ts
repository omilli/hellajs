import { keyframes, style } from "@hellajs/css";

const inTop = keyframes({ from: { opacity: "0", transform: "translateY(0.5rem) scale(0.95)" } });
const inBottom = keyframes({ from: { opacity: "0", transform: "translateY(-0.5rem) scale(0.95)" } });
const inLeft = keyframes({ from: { opacity: "0", transform: "translateX(0.5rem) scale(0.95)" } });
const inRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

export const base = style({
  alignItems: "center",
  background: "var(--background)",
  border: "1px solid var(--border)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  boxSizing: "border-box",
  display: "inline-flex",
  flexShrink: "0",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  height: "2.25rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  paddingBlock: "0.5rem",
  paddingInline: "1rem",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  whiteSpace: "nowrap",
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&:hover": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&:has(> svg)": {
    paddingInline: "0.75rem",
  },
  "&:is(.dark *)": {
    borderColor: "var(--input)",
    background: "color-mix(in oklab, var(--input) 30%, transparent)",
  },
  "&:is(.dark *):hover": {
    background: "color-mix(in oklab, var(--input) 50%, transparent)",
  },
}, { label: "hella-dropdown-menu-base", layer: "hella" });

export const content = style({
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  color: "var(--popover-foreground)",
  maxHeight: "var(--radix-dropdown-menu-content-available-height)",
  minWidth: "8rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  overflowX: "hidden",
  overflowY: "auto",
  padding: "0.25rem",
  transformOrigin: "var(--radix-dropdown-menu-content-transform-origin)",
  zIndex: "50",
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
}, { label: "hella-dropdown-menu-content", layer: "hella" });

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
  paddingInline: "0.5rem",
  position: "relative",
  userSelect: "none",
  "&:focus": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&[data-disabled]": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[data-inset]": {
    paddingLeft: "2rem",
  },
  "&[data-variant='destructive']": {
    color: "var(--destructive)",
  },
  "&[data-variant='destructive']:focus": {
    backgroundColor: "color-mix(in oklab, var(--destructive) 10%, transparent)",
    color: "var(--destructive)",
  },
  "&:is(.dark *)[data-variant='destructive']:focus": {
    backgroundColor: "color-mix(in oklab, var(--destructive) 20%, transparent)",
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
  "&[data-variant='destructive'] svg": {
    color: "var(--destructive) !important",
  },
}, { label: "hella-dropdown-menu-item", layer: "hella" });

export const checkItem = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.6)",
  cursor: "default",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  paddingLeft: "2rem",
  paddingRight: "0.5rem",
  paddingBlock: "0.375rem",
  position: "relative",
  userSelect: "none",
  "&:focus": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&[data-disabled]": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
}, { label: "hella-dropdown-menu-check-item", layer: "hella" });

export const radioItem = style({
  alignItems: "center",
  borderRadius: "calc(var(--radius) * 0.6)",
  cursor: "default",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  paddingLeft: "2rem",
  paddingRight: "0.5rem",
  paddingBlock: "0.375rem",
  position: "relative",
  userSelect: "none",
  "&:focus": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&[data-disabled]": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
}, { label: "hella-dropdown-menu-radio-item", layer: "hella" });

export const indicator = style({
  alignItems: "center",
  display: "flex",
  height: "0.875rem",
  justifyContent: "center",
  left: "0.5rem",
  pointerEvents: "none",
  position: "absolute",
  width: "0.875rem",
}, { label: "hella-dropdown-menu-indicator", layer: "hella" });

export const icon = style({
  height: "1rem",
  width: "1rem",
}, { label: "hella-dropdown-menu-icon", layer: "hella" });

export const radioIcon = style({
  fill: "currentColor",
  height: "0.5rem",
  width: "0.5rem",
}, { label: "hella-dropdown-menu-radio-icon", layer: "hella" });

export const label = style({
  fontSize: "0.875rem",
  fontWeight: "500",
  lineHeight: "1.25rem",
  paddingBlock: "0.375rem",
  paddingInline: "0.5rem",
  "&[data-inset]": {
    paddingLeft: "2rem",
  },
}, { label: "hella-dropdown-menu-label", layer: "hella" });

export const separator = style({
  backgroundColor: "var(--border)",
  height: "1px",
  marginBottom: "0.25rem",
  marginLeft: "-0.25rem",
  marginRight: "-0.25rem",
  marginTop: "0.25rem",
}, { label: "hella-dropdown-menu-separator", layer: "hella" });

export const shortcut = style({
  color: "var(--muted-foreground)",
  fontSize: "0.75rem",
  letterSpacing: "0.1em",
  lineHeight: "1rem",
  marginLeft: "auto",
}, { label: "hella-dropdown-menu-shortcut", layer: "hella" });

export const subTrigger = style({
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
  paddingInline: "0.5rem",
  position: "relative",
  userSelect: "none",
  "&:focus": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&[data-inset]": {
    paddingLeft: "2rem",
  },
  "&[data-state='open']": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
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
}, { label: "hella-dropdown-menu-sub-trigger", layer: "hella" });

export const chevron = style({
  height: "1rem",
  marginLeft: "auto",
  width: "1rem",
}, { label: "hella-dropdown-menu-chevron", layer: "hella" });

export const subContent = style({
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  color: "var(--popover-foreground)",
  minWidth: "8rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  overflow: "hidden",
  padding: "0.25rem",
  transformOrigin: "var(--radix-dropdown-menu-content-transform-origin)",
  zIndex: "50",
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
}, { label: "hella-dropdown-menu-sub-content", layer: "hella" });

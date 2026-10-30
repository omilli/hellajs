import { keyframes, style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

const inTop = keyframes({ from: { opacity: "0", transform: "translateY(0.5rem) scale(0.95)" } });
const inBottom = keyframes({
  from: { opacity: "0", transform: "translateY(-0.5rem) scale(0.95)" },
});
const inLeft = keyframes({ from: { opacity: "0", transform: "translateX(0.5rem) scale(0.95)" } });
const inRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

export const base = style("popover-trigger", {
  alignItems: "center",
  background: tokens.background,
  border: `1px solid ${tokens.border}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
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
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&:hover": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:has(> svg)": {
    paddingInline: "0.75rem",
  },
  "&:is(.dark *)": {
    borderColor: tokens.input,
    background: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
  },
  "&:is(.dark *):hover": {
    background: `color-mix(in oklab, ${tokens.input} 50%, transparent)`,
  },
});

export const content = style("popover-content", {
  backgroundColor: tokens.popover,
  border: `1px solid ${tokens.border}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  color: tokens.popoverForeground,
  outline: "2px solid transparent",
  outlineOffset: "2px",
  padding: "1rem",
  transformOrigin: "var(--radix-popover-content-transform-origin)",
  width: "18rem",
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
});

export const header = style("popover-header", {
  display: "flex",
  flexDirection: "column",
  gap: "0.25rem",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
});

export const title = style("popover-title", {
  fontWeight: "500",
});

export const description = style("popover-description", {
  color: tokens.mutedForeground,
});

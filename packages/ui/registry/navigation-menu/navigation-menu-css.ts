import { keyframes, style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

const in90 = keyframes({ from: { opacity: "0", transform: "scale(0.9)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });
const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });

export const base = style("navigation-menu-base", {
  alignItems: "center",
  display: "flex",
  flex: "1 1 0%",
  justifyContent: "center",
  maxWidth: "max-content",
  position: "relative",
});

export const list = style("navigation-menu-list", {
  alignItems: "center",
  display: "flex",
  flex: "1 1 0%",
  gap: "0.25rem",
  justifyContent: "center",
  listStyle: "none",
});

export const item = style("navigation-menu-item", {
  position: "relative",
});

export const trigger = style("navigation-menu-trigger", {
  alignItems: "center",
  background: tokens.background,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxSizing: "border-box",
  display: "inline-flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  height: "2.25rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  paddingBlock: "0.5rem",
  paddingInline: "1rem",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "max-content",
  "&:hover": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:focus": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
    outline: "1px solid",
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[data-state='open']": {
    backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
    color: tokens.accentForeground,
  },
  "&[data-state='open']:hover": {
    backgroundColor: tokens.accent,
  },
  "&[data-state='open']:focus": {
    backgroundColor: tokens.accent,
  },
  "&[data-state='open'] svg": {
    transform: "rotate(180deg)",
  },
});

export const chevron = style("navigation-menu-chevron", {
  height: "0.75rem",
  marginLeft: "0.25rem",
  position: "relative",
  top: "1px",
  transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "0.75rem",
});

export const content = style("navigation-menu-content", {
  left: "0",
  padding: "0.5rem",
  paddingRight: "0.625rem",
  top: "0",
  width: "100%",
  "& [data-slot='navigation-menu-link']:focus": {
    boxShadow: "none",
    outlineStyle: "none",
  },
  "& [data-slot='navigation-menu-link']:focus-visible": {
    boxShadow: "none",
    outlineStyle: "none",
  },
  "@media (min-width: 48rem)": {
    "&": {
      position: "absolute",
      width: "auto",
    },
  },
});

export const link = style("navigation-menu-link", {
  borderRadius: `calc(${tokens.radius} * 0.6)`,
  boxSizing: "border-box",
  display: "flex",
  flexDirection: "column",
  fontSize: "0.875rem",
  gap: "0.25rem",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  padding: "0.5rem",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:focus": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
  },
  "&:focus-visible": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
    outline: "1px solid",
  },
  "&[data-active='true']": {
    backgroundColor: `color-mix(in oklab, ${tokens.accent} 50%, transparent)`,
    color: tokens.accentForeground,
  },
  "&[data-active='true']:hover": {
    backgroundColor: tokens.accent,
  },
  "&[data-active='true']:focus": {
    backgroundColor: tokens.accent,
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "& svg:not([class*='text-'])": {
    color: tokens.mutedForeground,
  },
});

export const viewportWrapper = style("navigation-menu-viewport-wrapper", {
  isolation: "isolate",
  display: "flex",
  justifyContent: "center",
  left: "0",
  position: "absolute",
  top: "100%",
  zIndex: "50",
});

export const contentAnchor = style("navigation-menu-content-anchor", {
  display: "contents",
});

export const viewport = style("navigation-menu-viewport", {
  backgroundColor: tokens.popover,
  border: `1px solid ${tokens.border}`,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  color: tokens.popoverForeground,
  height: "var(--radix-navigation-menu-viewport-height)",
  marginTop: "0.375rem",
  overflow: "hidden",
  position: "relative",
  transformOrigin: "top center",
  width: "100%",
  "&[data-state='open']": {
    animation: `${in90} 150ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${out} 150ms ease-in both`,
  },
  "@media (min-width: 48rem)": {
    "&": {
      width: "var(--radix-navigation-menu-viewport-width)",
    },
  },
});

export const indicator = style("navigation-menu-indicator", {
  alignItems: "flex-end",
  display: "flex",
  height: "0.375rem",
  justifyContent: "center",
  overflow: "hidden",
  top: "100%",
  transition: "transform 200ms cubic-bezier(0.4, 0, 0.2, 1), width 200ms cubic-bezier(0.4, 0, 0.2, 1)",
  zIndex: "1",
  "&[data-state='visible']": {
    animation: `${fadeIn} 150ms ease-out both`,
  },
  "&[data-state='hidden']": {
    animation: `${fadeOut} 150ms ease-in both`,
  },
});

export const diamond = style("navigation-menu-diamond", {
  background: tokens.border,
  borderTopLeftRadius: `calc(${tokens.radius} * 0.6)`,
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  height: "0.5rem",
  position: "relative",
  top: "60%",
  transform: "rotate(45deg)",
  width: "0.5rem",
});

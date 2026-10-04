import { keyframes, style } from "@hellajs/css";

const in90 = keyframes({ from: { opacity: "0", transform: "scale(0.9)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });
const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });

export const base = style({
  alignItems: "center",
  display: "flex",
  flex: "1 1 0%",
  justifyContent: "center",
  maxWidth: "max-content",
  position: "relative",
}, { label: "navigation-menu-base" });

export const list = style({
  alignItems: "center",
  display: "flex",
  flex: "1 1 0%",
  gap: "0.25rem",
  justifyContent: "center",
  listStyle: "none",
}, { label: "navigation-menu-list" });

export const item = style({
  position: "relative",
}, { label: "navigation-menu-item" });

export const trigger = style({
  alignItems: "center",
  background: "var(--background)",
  borderRadius: "calc(var(--radius) * 0.8)",
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
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&:focus": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
    outline: "1px solid",
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[data-state='open']": {
    backgroundColor: "color-mix(in oklab, var(--accent) 50%, transparent)",
    color: "var(--accent-foreground)",
  },
  "&[data-state='open']:hover": {
    backgroundColor: "var(--accent)",
  },
  "&[data-state='open']:focus": {
    backgroundColor: "var(--accent)",
  },
  "&[data-state='open'] svg": {
    transform: "rotate(180deg)",
  },
}, { label: "navigation-menu-trigger" });

export const chevron = style({
  height: "0.75rem",
  marginLeft: "0.25rem",
  position: "relative",
  top: "1px",
  transition: "transform 300ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "0.75rem",
}, { label: "navigation-menu-chevron" });

export const content = style({
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
}, { label: "navigation-menu-content" });

export const link = style({
  borderRadius: "calc(var(--radius) * 0.6)",
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
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&:focus": {
    backgroundColor: "var(--accent)",
    color: "var(--accent-foreground)",
  },
  "&:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
    outline: "1px solid",
  },
  "&[data-active='true']": {
    backgroundColor: "color-mix(in oklab, var(--accent) 50%, transparent)",
    color: "var(--accent-foreground)",
  },
  "&[data-active='true']:hover": {
    backgroundColor: "var(--accent)",
  },
  "&[data-active='true']:focus": {
    backgroundColor: "var(--accent)",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "& svg:not([class*='text-'])": {
    color: "var(--muted-foreground)",
  },
}, { label: "navigation-menu-link" });

export const viewportWrapper = style({
  isolation: "isolate",
  display: "flex",
  justifyContent: "center",
  left: "0",
  position: "absolute",
  top: "100%",
  zIndex: "50",
}, { label: "navigation-menu-viewport-wrapper" });

export const contentAnchor = style({
  display: "contents",
}, { label: "navigation-menu-content-anchor" });

export const viewport = style({
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  color: "var(--popover-foreground)",
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
}, { label: "navigation-menu-viewport" });

export const indicator = style({
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
}, { label: "navigation-menu-indicator" });

export const diamond = style({
  background: "var(--border)",
  borderTopLeftRadius: "calc(var(--radius) * 0.6)",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  height: "0.5rem",
  position: "relative",
  top: "60%",
  transform: "rotate(45deg)",
  width: "0.5rem",
}, { label: "navigation-menu-diamond" });

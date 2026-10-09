import { keyframes, style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });
const zoomIn = keyframes({ from: { opacity: "0", transform: "scale(0.95)" } });
const zoomOut = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

export const base = style("command", {
  backgroundColor: tokens.popover,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  color: tokens.popoverForeground,
  display: "flex",
  flexDirection: "column",
  height: "100%",
  overflow: "hidden",
  width: "100%",
});

export const inputWrapper = style("command-input-wrapper", {
  alignItems: "center",
  borderBottom: `1px solid ${tokens.border}`,
  display: "flex",
  gap: "0.5rem",
  height: "2.25rem",
  paddingInline: "0.75rem",
});

export const icon = style("command-icon", {
  flexShrink: "0",
  height: "1rem",
  opacity: "0.5",
  width: "1rem",
});

export const input = style("command-input", {
  backgroundColor: "transparent",
  borderRadius: `calc(${tokens.radius} * 0.8)`,
  display: "flex",
  fontSize: "0.875rem",
  height: "2.5rem",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  paddingBlock: "0.75rem",
  width: "100%",
  "&::placeholder": {
    color: tokens.mutedForeground,
  },
  "&:disabled": {
    cursor: "not-allowed",
    opacity: "0.5",
  },
});

export const list = style("command-list", {
  maxHeight: "300px",
  overflowX: "hidden",
  overflowY: "auto",
  scrollPaddingBlock: "0.25rem",
});

export const empty = style("command-empty", {
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
  paddingBlock: "1.5rem",
  textAlign: "center",
});

export const group = style("command-group", {
  color: tokens.foreground,
  overflow: "hidden",
  padding: "0.25rem",
  "& [data-slot='command-group-heading']": {
    color: tokens.mutedForeground,
    fontSize: "0.75rem",
    fontWeight: "500",
    lineHeight: "1rem",
    paddingInline: "0.5rem",
    paddingBlock: "0.375rem",
  },
});

export const groupHeading = style("command-group-heading", {
  color: tokens.mutedForeground,
  fontSize: "0.75rem",
  fontWeight: "500",
  lineHeight: "1rem",
  paddingInline: "0.5rem",
  paddingBlock: "0.375rem",
});

export const separator = style("command-separator", {
  backgroundColor: tokens.border,
  height: "1px",
  marginInline: "-0.25rem",
});

export const item = style("command-item", {
  alignItems: "center",
  borderRadius: `calc(${tokens.radius} * 0.6)`,
  cursor: "default",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  lineHeight: "1.25rem",
  outline: "2px solid transparent",
  outlineOffset: "2px",
  paddingInline: "0.5rem",
  paddingBlock: "0.375rem",
  position: "relative",
  userSelect: "none",
  "&[data-disabled='true']": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&[data-selected='true']": {
    backgroundColor: tokens.accent,
    color: tokens.accentForeground,
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
    color: tokens.mutedForeground,
  },
});

export const shortcut = style("command-shortcut", {
  color: tokens.mutedForeground,
  fontSize: "0.75rem",
  letterSpacing: "0.1em",
  lineHeight: "1rem",
  marginLeft: "auto",
});

export const palette = style("command-palette", {
  "& [data-slot='command-input-wrapper']": {
    height: "3rem",
  },
  "& [data-slot='command-input-wrapper'] svg": {
    height: "1.25rem",
    width: "1.25rem",
  },
  "& [data-slot='command-input']": {
    height: "3rem",
  },
  "& [data-slot='command-group']": {
    paddingInline: "0.5rem",
  },
  "& [data-slot='command-group']:not([hidden]) ~ [data-slot='command-group']": {
    paddingTop: "0",
  },
  "& [data-slot='command-group-heading']": {
    color: tokens.mutedForeground,
    fontWeight: "500",
    paddingInline: "0.5rem",
  },
  "& [data-slot='command-item']": {
    paddingBlock: "0.75rem",
    paddingInline: "0.5rem",
  },
  "& [data-slot='command-item'] svg": {
    height: "1.25rem",
    width: "1.25rem",
  },
});

export const dialogOverlay = style("command-dialog-overlay", {
  backgroundColor: "rgb(0 0 0 / 0.5)",
  inset: "0",
  position: "fixed",
  zIndex: "50",
  "&[data-state='open']": {
    animation: `${fadeIn} 150ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${fadeOut} 150ms ease-in both`,
  },
});

export const dialogPanel = style("command-dialog-panel", {
  background: tokens.background,
  border: `1px solid ${tokens.border}`,
  borderRadius: tokens.radius,
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  display: "grid",
  gap: "1rem",
  left: "50%",
  maxWidth: "calc(100% - 2rem)",
  outlineStyle: "none",
  overflow: "hidden",
  padding: "0",
  position: "fixed",
  top: "50%",
  translate: "-50% -50%",
  width: "100%",
  zIndex: "50",
  "&[data-state='open']": {
    animation: `${zoomIn} 200ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${zoomOut} 200ms ease-in both`,
  },
  "@media (min-width: 40rem)": {
    "&": {
      maxWidth: "32rem",
    },
  },
});

export const dialogHeader = style("command-dialog-header", {
  clip: "rect(0, 0, 0, 0)",
  borderWidth: "0",
  height: "1px",
  margin: "-1px",
  overflow: "hidden",
  padding: "0",
  position: "absolute",
  whiteSpace: "nowrap",
  width: "1px",
});

export const dialogTitle = style("command-dialog-title", {
  fontSize: "1.125rem",
  fontWeight: "600",
  lineHeight: "1",
});

export const dialogDescription = style("command-dialog-description", {
  color: tokens.mutedForeground,
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
});

export const dialogClose = style("command-dialog-close", {
  borderRadius: `calc(${tokens.radius} * 0.2)`,
  opacity: "0.7",
  position: "absolute",
  right: "1rem",
  top: "1rem",
  transition: "opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    opacity: "1",
  },
  "&:focus": {
    boxShadow: `0 0 0 2px ${tokens.background}, 0 0 0 4px ${tokens.ring}`,
    outlineStyle: "none",
  },
  "&:disabled": {
    pointerEvents: "none",
  },
  "&[data-state='open']": {
    backgroundColor: tokens.accent,
    color: tokens.mutedForeground,
  },
  "& svg": {
    flexShrink: "0",
    pointerEvents: "none",
  },
  "& svg:not([class*='size-'])": {
    height: "1rem",
    width: "1rem",
  },
  "& span": {
    clip: "rect(0, 0, 0, 0)",
    borderWidth: "0",
    height: "1px",
    margin: "-1px",
    overflow: "hidden",
    padding: "0",
    position: "absolute",
    whiteSpace: "nowrap",
    width: "1px",
  },
});

import { keyframes, style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });
const zoomIn = keyframes({ from: { opacity: "0", transform: "scale(0.95)" } });
const zoomOut = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

export const base = style("dialog-overlay", {
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

export const content = style("dialog-content", {
  background: tokens.background,
  border: `1px solid ${tokens.border}`,
  borderRadius: tokens.radius,
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  display: "grid",
  gap: "1rem",
  left: "50%",
  maxWidth: "calc(100% - 2rem)",
  outlineStyle: "none",
  padding: "1.5rem",
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

export const close = style("dialog-close", {
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

export const header = style("dialog-header", {
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  textAlign: "center",
  "@media (min-width: 40rem)": {
    "&": {
      textAlign: "left",
    },
  },
});

export const footer = style("dialog-footer", {
  display: "flex",
  flexDirection: "column-reverse",
  gap: "0.5rem",
  "@media (min-width: 40rem)": {
    "&": {
      flexDirection: "row",
      justifyContent: "flex-end",
    },
  },
});

export const title = style("dialog-title", {
  fontSize: "1.125rem",
  fontWeight: "600",
  lineHeight: "1",
});

export const description = style("dialog-description", {
  color: tokens.mutedForeground,
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
});

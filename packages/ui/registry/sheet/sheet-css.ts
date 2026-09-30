import { keyframes, style } from "@hellajs/css";

const fadeIn = keyframes({ from: { opacity: "0" } });
const fadeOut = keyframes({ to: { opacity: "0" } });
const slideInTop = keyframes({ from: { opacity: "0", transform: "translateY(-100%)" } });
const slideOutTop = keyframes({ to: { opacity: "0", transform: "translateY(-100%)" } });
const slideInRight = keyframes({ from: { opacity: "0", transform: "translateX(100%)" } });
const slideOutRight = keyframes({ to: { opacity: "0", transform: "translateX(100%)" } });
const slideInBottom = keyframes({ from: { opacity: "0", transform: "translateY(100%)" } });
const slideOutBottom = keyframes({ to: { opacity: "0", transform: "translateY(100%)" } });
const slideInLeft = keyframes({ from: { opacity: "0", transform: "translateX(-100%)" } });
const slideOutLeft = keyframes({ to: { opacity: "0", transform: "translateX(-100%)" } });

export const base = style({
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
}, { label: "hella-sheet-base", layer: "hella" });

export const content = style({
  background: "var(--background)",
  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
  display: "flex",
  flexDirection: "column",
  gap: "1rem",
  position: "fixed",
  transition: "opacity 150ms ease-in-out, transform 150ms ease-in-out",
  zIndex: "50",
}, { label: "hella-sheet-content", layer: "hella" });

export const contentSides = {
  right: style({
    bottom: "0",
    borderLeft: "1px solid var(--border)",
    height: "100%",
    right: "0",
    top: "0",
    width: "75%",
    "&[data-state='open']": {
      animation: `${slideInRight} 500ms ease-in-out both`,
    },
    "&[data-state='closed']": {
      animation: `${slideOutRight} 300ms ease-in both`,
    },
    "@media (min-width: 40rem)": {
      "&": {
        maxWidth: "24rem",
      },
    },
  }, { label: "hella-sheet-content-right", layer: "hella" }),
  left: style({
    bottom: "0",
    borderRight: "1px solid var(--border)",
    height: "100%",
    left: "0",
    top: "0",
    width: "75%",
    "&[data-state='open']": {
      animation: `${slideInLeft} 500ms ease-in-out both`,
    },
    "&[data-state='closed']": {
      animation: `${slideOutLeft} 300ms ease-in both`,
    },
    "@media (min-width: 40rem)": {
      "&": {
        maxWidth: "24rem",
      },
    },
  }, { label: "hella-sheet-content-left", layer: "hella" }),
  top: style({
    borderBottom: "1px solid var(--border)",
    height: "auto",
    left: "0",
    right: "0",
    top: "0",
    "&[data-state='open']": {
      animation: `${slideInTop} 500ms ease-in-out both`,
    },
    "&[data-state='closed']": {
      animation: `${slideOutTop} 300ms ease-in both`,
    },
  }, { label: "hella-sheet-content-top", layer: "hella" }),
  bottom: style({
    borderTop: "1px solid var(--border)",
    bottom: "0",
    height: "auto",
    left: "0",
    right: "0",
    "&[data-state='open']": {
      animation: `${slideInBottom} 500ms ease-in-out both`,
    },
    "&[data-state='closed']": {
      animation: `${slideOutBottom} 300ms ease-in both`,
    },
  }, { label: "hella-sheet-content-bottom", layer: "hella" }),
};

export const close = style({
  borderRadius: "calc(var(--radius) * 0.2)",
  opacity: "0.7",
  position: "absolute",
  right: "1rem",
  top: "1rem",
  transition: "opacity 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  "&:hover": {
    opacity: "1",
  },
  "&:focus": {
    boxShadow: "0 0 0 2px var(--background), 0 0 0 4px var(--ring)",
    outlineStyle: "none",
  },
  "&:disabled": {
    pointerEvents: "none",
  },
  "&[data-state='open']": {
    backgroundColor: "var(--secondary)",
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
}, { label: "hella-sheet-close", layer: "hella" });

export const header = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.375rem",
  padding: "1rem",
}, { label: "hella-sheet-header", layer: "hella" });

export const footer = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.5rem",
  marginTop: "auto",
  padding: "1rem",
}, { label: "hella-sheet-footer", layer: "hella" });

export const title = style({
  color: "var(--foreground)",
  fontWeight: "600",
}, { label: "hella-sheet-title", layer: "hella" });

export const description = style({
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
  lineHeight: "1.25rem",
}, { label: "hella-sheet-description", layer: "hella" });

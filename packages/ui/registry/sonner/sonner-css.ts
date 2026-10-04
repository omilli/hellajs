import { css, keyframes, style } from "@hellajs/css";

const enter = keyframes({
  from: { opacity: "0", transform: "translateY(var(--enter-offset, 100%))" },
});
const spin = keyframes({
  to: { transform: "rotate(360deg)" },
});

export const base = style({
  display: "flex",
  flexDirection: "column",
  gap: "0.75rem",
  inset: "0",
  listStyle: "none",
  margin: "0",
  padding: "1rem",
  pointerEvents: "none",
  position: "fixed",
  zIndex: "100",
}, { label: "sonner-base" });

export const toasterPositions = {
  "top-left": style({
    alignItems: "flex-start",
    flexDirection: "column",
    justifyContent: "flex-start",
    "--enter-offset": "-100%",
    "--stack-offset": "1.5rem",
    "--stack-origin": "top",
  }, { label: "sonner-toaster-top-left" }),
  "top-center": style({
    alignItems: "center",
    flexDirection: "column",
    justifyContent: "flex-start",
    "--enter-offset": "-100%",
    "--stack-offset": "1.5rem",
    "--stack-origin": "top",
  }, { label: "sonner-toaster-top-center" }),
  "top-right": style({
    alignItems: "flex-end",
    flexDirection: "column",
    justifyContent: "flex-start",
    "--enter-offset": "-100%",
    "--stack-offset": "1.5rem",
    "--stack-origin": "top",
  }, { label: "sonner-toaster-top-right" }),
  "bottom-left": style({
    alignItems: "flex-start",
    flexDirection: "column-reverse",
    justifyContent: "flex-start",
    "--enter-offset": "100%",
    "--stack-offset": "-1.5rem",
    "--stack-origin": "bottom",
  }, { label: "sonner-toaster-bottom-left" }),
  "bottom-center": style({
    alignItems: "center",
    flexDirection: "column-reverse",
    justifyContent: "flex-start",
    "--enter-offset": "100%",
    "--stack-offset": "-1.5rem",
    "--stack-origin": "bottom",
  }, { label: "sonner-toaster-bottom-center" }),
  "bottom-right": style({
    alignItems: "flex-end",
    flexDirection: "column-reverse",
    justifyContent: "flex-start",
    "--enter-offset": "100%",
    "--stack-offset": "-1.5rem",
    "--stack-origin": "bottom",
  }, { label: "sonner-toaster-bottom-right" }),
};

export const item = style({
  alignItems: "center",
  animation: `${enter} 400ms ease-out`,
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "calc(var(--radius) * 0.8)",
  boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
  color: "var(--popover-foreground)",
  display: "flex",
  fontSize: "0.875rem",
  gap: "0.5rem",
  maxHeight: "var(--toast-height, 16rem)",
  maxWidth: "calc(100vw - 2rem)",
  padding: "1rem",
  pointerEvents: "auto",
  position: "relative",
  transformOrigin: "var(--stack-origin, bottom)",
  transition: "opacity 200ms ease-out, transform 200ms ease-out, max-height 200ms ease-out, padding 200ms ease-out",
  width: "356px",
  zIndex: "4",
  "&[data-depth='1']": {
    transform: "translateY(calc(var(--stack-offset) * 1)) scale(0.95)",
    zIndex: "3",
  },
  "&[data-depth='2']": {
    transform: "translateY(calc(var(--stack-offset) * 2)) scale(0.9)",
    zIndex: "2",
  },
  "&[data-depth='3']": {
    transform: "translateY(calc(var(--stack-offset) * 3)) scale(0.85)",
    zIndex: "1",
  },
  "&[data-dragging='true']": {
    transitionProperty: "none",
  },
  "&[data-removed='true']": {
    maxHeight: "0",
    opacity: "0",
    overflow: "hidden",
    paddingBottom: "0",
    paddingTop: "0",
    pointerEvents: "none",
  },
  "&[data-rich-colors='true'][data-type='success']": {
    backgroundColor: "#f0fdf4",
    borderColor: "#16a34a",
    color: "#166534",
  },
  "&[data-rich-colors='true'][data-type='error']": {
    backgroundColor: "#fef2f2",
    borderColor: "#dc2626",
    color: "#991b1b",
  },
  "&[data-rich-colors='true'][data-type='warning']": {
    backgroundColor: "#fffbeb",
    borderColor: "#d97706",
    color: "#92400e",
  },
  "&[data-rich-colors='true'][data-type='info']": {
    backgroundColor: "#eff6ff",
    borderColor: "#2563eb",
    color: "#1e40af",
  },
  "&:is(.dark *)[data-rich-colors='true'][data-type='success']": {
    backgroundColor: "#052e16",
    borderColor: "#15803d",
    color: "#86efac",
  },
  "&:is(.dark *)[data-rich-colors='true'][data-type='error']": {
    backgroundColor: "#450a0a",
    borderColor: "#b91c1c",
    color: "#fca5a5",
  },
  "&:is(.dark *)[data-rich-colors='true'][data-type='warning']": {
    backgroundColor: "#451a03",
    borderColor: "#b45309",
    color: "#fcd34d",
  },
  "&:is(.dark *)[data-rich-colors='true'][data-type='info']": {
    backgroundColor: "#172554",
    borderColor: "#1d4ed8",
    color: "#93c5fd",
  },
}, { label: "sonner-item" });

export const content = style({
  display: "flex",
  flex: "1",
  flexDirection: "column",
  gap: "0.125rem",
  minWidth: "0",
}, { label: "sonner-content" });

export const title = style({
  fontWeight: "500",
  lineHeight: "1.25rem",
}, { label: "sonner-title" });

export const description = style({
  opacity: "0.9",
}, { label: "sonner-description" });

export const icon = style({
  alignItems: "center",
  display: "inline-flex",
  flexShrink: "0",
  "& svg": {
    flexShrink: "0",
    height: "1rem",
    width: "1rem",
  },
  "&[data-type='success']": { color: "#16a34a" },
  "&[data-type='error']": { color: "#dc2626" },
  "&[data-type='warning']": { color: "#f59e0b" },
  "&[data-type='info']": { color: "#3b82f6" },
  "&:is(.dark *)[data-type='success']": { color: "#22c55e" },
  "&:is(.dark *)[data-type='error']": { color: "#ef4444" },
  "&:is(.dark *)[data-type='warning']": { color: "#fbbf24" },
  "&:is(.dark *)[data-type='info']": { color: "#60a5fa" },
  "&[data-type='loading'] svg": {
    animation: `${spin} 1s linear infinite`,
  },
}, { label: "sonner-icon" });

export const actionButton = style({
  alignItems: "center",
  background: "transparent",
  border: "1px solid color-mix(in oklab, currentColor 30%, transparent)",
  borderRadius: "calc(var(--radius) * 0.8)",
  color: "inherit",
  cursor: "pointer",
  display: "inline-flex",
  flexShrink: "0",
  fontSize: "0.75rem",
  fontWeight: "500",
  height: "2rem",
  justifyContent: "center",
  padding: "0 0.75rem",
  transition: "background-color 150ms ease-out",
  "&:hover": {
    background: "color-mix(in oklab, currentColor 12%, transparent)",
  },
}, { label: "sonner-action" });

export const close = style({
  alignItems: "center",
  background: "transparent",
  border: "none",
  borderRadius: "calc(var(--radius) * 0.5)",
  color: "inherit",
  cursor: "pointer",
  display: "inline-flex",
  flexShrink: "0",
  opacity: "0",
  padding: "0.25rem",
  position: "absolute",
  right: "0.5rem",
  top: "0.5rem",
  transition: "opacity 150ms ease-out",
  "& svg": {
    flexShrink: "0",
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
  "&:focus-visible": {
    boxShadow: "0 0 0 2px var(--background), 0 0 0 4px var(--ring)",
    opacity: "1",
    outlineStyle: "none",
  },
}, { label: "sonner-close" });

css({
  "[data-slot='sonner-toast']:hover [data-slot='sonner-close']": {
    opacity: "1",
  },
});

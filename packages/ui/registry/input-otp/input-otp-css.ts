import { keyframes, style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

const caretBlink = keyframes({
  "0%,70%,100%": { opacity: "1" },
  "20%,50%": { opacity: "0" },
});

export const base = style("input-otp", {
  alignItems: "center",
  display: "flex",
  gap: "0.5rem",
  "&:has(:disabled)": {
    opacity: "0.5",
  },
});

export const control = style("input-otp-input", {
  "&:disabled": {
    cursor: "not-allowed",
  },
  "&::selection": {
    backgroundColor: "transparent",
    color: "transparent",
  },
});

export const group = style("input-otp-group", {
  alignItems: "center",
  display: "flex",
});

export const slot = style("input-otp-slot", {
  alignItems: "center",
  borderBlock: `1px solid ${tokens.input}`,
  borderRight: `1px solid ${tokens.input}`,
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  display: "flex",
  fontSize: "0.875rem",
  height: "2.25rem",
  justifyContent: "center",
  lineHeight: "1.25rem",
  outlineStyle: "none",
  position: "relative",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "2.25rem",
  "&:first-child": {
    borderBottomLeftRadius: `calc(${tokens.radius} * 0.8)`,
    borderLeft: `1px solid ${tokens.input}`,
    borderTopLeftRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "&:last-child": {
    borderBottomRightRadius: `calc(${tokens.radius} * 0.8)`,
    borderTopRightRadius: `calc(${tokens.radius} * 0.8)`,
  },
  "&[aria-invalid='true']": {
    borderColor: tokens.destructive,
  },
  "&[data-active='true']": {
    borderColor: tokens.ring,
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
    zIndex: "10",
  },
  "&[data-active='true'][aria-invalid='true']": {
    borderColor: tokens.destructive,
  },
  "&[data-active='true'][aria-invalid='true']:is(.dark *)": {
    boxShadow: `0 0 0 3px color-mix(in oklab, ${tokens.destructive} 40%, transparent)`,
  },
  "&:is(.dark *)": {
    backgroundColor: `color-mix(in oklab, ${tokens.input} 30%, transparent)`,
  },
});

export const caretWrap = style("input-otp-caret", {
  alignItems: "center",
  display: "flex",
  inset: "0",
  justifyContent: "center",
  pointerEvents: "none",
  position: "absolute",
});

export const caret = style("input-otp-caret-bar", {
  animation: `${caretBlink} 1s ease-out infinite`,
  backgroundColor: tokens.foreground,
  height: "1rem",
  width: "1px",
});

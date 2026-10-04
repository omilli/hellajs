import { keyframes, style } from "@hellajs/css";

const caretBlink = keyframes({
  "0%,70%,100%": { opacity: "1" },
  "20%,50%": { opacity: "0" },
});

export const base = style({
  alignItems: "center",
  display: "flex",
  gap: "0.5rem",
  "&:has(:disabled)": {
    opacity: "0.5",
  },
}, { label: "input-otp" });

export const control = style({
  "&:disabled": {
    cursor: "not-allowed",
  },
  "&::selection": {
    backgroundColor: "transparent",
    color: "transparent",
  },
}, { label: "input-otp-input" });

export const group = style({
  alignItems: "center",
  display: "flex",
}, { label: "input-otp-group" });

export const slot = style({
  alignItems: "center",
  borderBlock: "1px solid var(--input)",
  borderRight: "1px solid var(--input)",
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
    borderBottomLeftRadius: "calc(var(--radius) * 0.8)",
    borderLeft: "1px solid var(--input)",
    borderTopLeftRadius: "calc(var(--radius) * 0.8)",
  },
  "&:last-child": {
    borderBottomRightRadius: "calc(var(--radius) * 0.8)",
    borderTopRightRadius: "calc(var(--radius) * 0.8)",
  },
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[data-active='true']": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
    zIndex: "10",
  },
  "&[data-active='true'][aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[data-active='true'][aria-invalid='true']:is(.dark *)": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
  "&:is(.dark *)": {
    backgroundColor: "color-mix(in oklab, var(--input) 30%, transparent)",
  },
}, { label: "input-otp-slot" });

export const caretWrap = style({
  alignItems: "center",
  display: "flex",
  inset: "0",
  justifyContent: "center",
  pointerEvents: "none",
  position: "absolute",
}, { label: "input-otp-caret" });

export const caret = style({
  animation: `${caretBlink} 1s ease-out infinite`,
  backgroundColor: "var(--foreground)",
  height: "1rem",
  width: "1px",
}, { label: "input-otp-caret-bar" });

import { style } from "@hellajs/css";

export const base = style({
  display: "grid",
  gap: "0.75rem",
}, { label: "radio-group" });

export const item = style({
  aspectRatio: "1 / 1",
  border: "1px solid var(--input)",
  borderRadius: "9999px",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  boxSizing: "border-box",
  color: "var(--primary)",
  flexShrink: "0",
  height: "1rem",
  outlineStyle: "none",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "1rem",
  "&:focus-visible": {
    borderColor: "var(--ring)",
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:disabled": {
    cursor: "not-allowed",
    opacity: "0.5",
  },
  "&[aria-invalid='true']": {
    borderColor: "var(--destructive)",
  },
  "&[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 20%, transparent)",
  },
  "&:is(.dark *)": {
    backgroundColor: "color-mix(in oklab, var(--input) 30%, transparent)",
  },
  "&:is(.dark *)[aria-invalid='true']:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--destructive) 40%, transparent)",
  },
}, { label: "radio-group-item" });

export const indicator = style({
  alignItems: "center",
  display: "flex",
  justifyContent: "center",
  position: "relative",
}, { label: "radio-group-indicator" });

export const icon = style({
  fill: "var(--primary)",
  height: "0.5rem",
  left: "50%",
  position: "absolute",
  top: "50%",
  translate: "-50% -50%",
  width: "0.5rem",
}, { label: "radio-group-icon" });

export const row = style({
  alignItems: "center",
  display: "flex",
  gap: "0.5rem",
}, { label: "radio-group-row" });

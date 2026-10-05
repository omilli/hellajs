import { style } from "@hellajs/css";

export const base = style("checkbox", {
  boxSizing: "border-box",
  borderRadius: "4px",
  border: "1px solid var(--input)",
  boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
  flexShrink: "0",
  height: "1rem",
  outlineStyle: "none",
  transition: "box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
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
  "&[data-state='checked']": {
    backgroundColor: "var(--primary)",
    borderColor: "var(--primary)",
    color: "var(--primary-foreground)",
  },
  "&:is(.dark *)[data-state='checked']": {
    backgroundColor: "var(--primary)",
  },
});

export const indicator = style("checkbox-indicator", {
  color: "currentColor",
  display: "grid",
  placeContent: "center",
  transition: "none",
});

export const icon = style("checkbox-icon", {
  height: "0.875rem",
  width: "0.875rem",
});

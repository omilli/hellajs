import { style } from "@hellajs/css";

export const base = style({
  display: "grid",
  gap: "0.5rem",
}, { label: "hella-form-item", layer: "hella" });

export const label = style({
  alignItems: "center",
  display: "flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  lineHeight: "1",
  userSelect: "none",
  "&:is(.group[data-disabled='true'] *)": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&:is(.peer:disabled ~ *)": {
    cursor: "not-allowed",
    opacity: "0.5",
  },
  "&[data-error='true']": {
    color: "var(--destructive)",
  },
}, { label: "hella-form-label", layer: "hella" });

export const description = style({
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
}, { label: "hella-form-description", layer: "hella" });

export const message = style({
  color: "var(--destructive)",
  fontSize: "0.875rem",
}, { label: "hella-form-message", layer: "hella" });

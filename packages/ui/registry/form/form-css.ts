import { style } from "@hellajs/css";

export const base = style("form-item", {
  display: "grid",
  gap: "0.5rem",
});

export const label = style("form-label", {
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
});

export const description = style("form-description", {
  color: "var(--muted-foreground)",
  fontSize: "0.875rem",
});

export const message = style("form-message", {
  color: "var(--destructive)",
  fontSize: "0.875rem",
});

import { style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

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
    color: tokens.destructive,
  },
});

export const description = style("form-description", {
  color: tokens.mutedForeground,
  fontSize: "0.875rem",
});

export const message = style("form-message", {
  color: tokens.destructive,
  fontSize: "0.875rem",
});

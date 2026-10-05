import { style } from "@hellajs/css";

export const base = style("slider", {
  alignItems: "center",
  display: "flex",
  position: "relative",
  touchAction: "none",
  userSelect: "none",
  width: "100%",
  "&[data-disabled]": {
    opacity: "0.5",
  },
  "&[data-orientation='vertical']": {
    flexDirection: "column",
    height: "100%",
    minHeight: "11rem",
    width: "auto",
  },
});

export const track = style("slider-track", {
  borderRadius: "9999px",
  backgroundColor: "var(--muted)",
  flexGrow: "1",
  overflow: "hidden",
  position: "relative",
  "&[data-orientation='horizontal']": {
    height: "0.375rem",
    width: "100%",
  },
  "&[data-orientation='vertical']": {
    height: "100%",
    width: "0.375rem",
  },
});

export const range = style("slider-range", {
  backgroundColor: "var(--primary)",
  position: "absolute",
  "&[data-orientation='horizontal']": {
    height: "100%",
  },
  "&[data-orientation='vertical']": {
    width: "100%",
  },
});

export const thumb = style("slider-thumb", {
  backgroundColor: "#fff",
  border: "1px solid var(--primary)",
  borderRadius: "9999px",
  boxSizing: "border-box",
  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  display: "block",
  flexShrink: "0",
  height: "1rem",
  outlineStyle: "none",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "1rem",
  "&:hover": {
    boxShadow: "0 0 0 4px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:focus-visible": {
    boxShadow: "0 0 0 4px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
});

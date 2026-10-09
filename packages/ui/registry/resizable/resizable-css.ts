import { style } from "@hellajs/css";
import { tokens } from "../theme/tokens.js";

export const base = style("resizable-panel-group", {
  display: "flex",
  height: "100%",
  width: "100%",
  "&[aria-orientation='vertical']": {
    flexDirection: "column",
  },
});

export const handle = style("resizable-handle", {
  alignItems: "center",
  backgroundColor: tokens.border,
  display: "flex",
  justifyContent: "center",
  position: "relative",
  width: "1px",
  outlineStyle: "none",
  "&::after": {
    bottom: "0",
    left: "50%",
    position: "absolute",
    top: "0",
    translate: "-50%",
    width: "0.25rem",
  },
  "&:focus-visible": {
    boxShadow: `0 0 0 1px ${tokens.background}, 0 0 0 2px ${tokens.ring}`,
  },
  "&[aria-orientation='horizontal']": {
    height: "1px",
    width: "100%",
  },
  "&[aria-orientation='horizontal']::after": {
    height: "0.25rem",
    left: "0",
    translate: "0 -50%",
    width: "100%",
  },
  "&[aria-orientation='horizontal'] > div": {
    rotate: "90deg",
  },
});

export const grip = style("resizable-grip", {
  alignItems: "center",
  border: `1px solid ${tokens.border}`,
  borderRadius: "0.125rem",
  backgroundColor: tokens.border,
  display: "flex",
  height: "1rem",
  justifyContent: "center",
  width: "0.75rem",
  zIndex: "10",
});

export const icon = style("resizable-icon", {
  height: "0.625rem",
  width: "0.625rem",
});

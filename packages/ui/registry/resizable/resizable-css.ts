import { style } from "@hellajs/css";

export const base = style({
  display: "flex",
  height: "100%",
  width: "100%",
  "&[aria-orientation='vertical']": {
    flexDirection: "column",
  },
}, { label: "resizable-panel-group" });

export const handle = style({
  alignItems: "center",
  backgroundColor: "var(--border)",
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
    boxShadow: "0 0 0 1px var(--background), 0 0 0 2px var(--ring)",
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
}, { label: "resizable-handle" });

export const grip = style({
  alignItems: "center",
  border: "1px solid var(--border)",
  borderRadius: "0.125rem",
  backgroundColor: "var(--border)",
  display: "flex",
  height: "1rem",
  justifyContent: "center",
  width: "0.75rem",
  zIndex: "10",
}, { label: "resizable-grip" });

export const icon = style({
  height: "0.625rem",
  width: "0.625rem",
}, { label: "resizable-icon" });

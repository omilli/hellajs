import { style } from "@hellajs/css";

export const base = style("scroll-area", {
  position: "relative",
});

export const viewport = style("scroll-area-viewport", {
  height: "100%",
  width: "100%",
  borderRadius: "inherit",
  outlineStyle: "none",
  overflow: "scroll",
  scrollbarWidth: "none",
  transitionProperty: "color, box-shadow",
  transitionDuration: "150ms",
  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  "&::-webkit-scrollbar": {
    display: "none",
  },
  "&:focus-visible": {
    boxShadow: "0 0 0 3px color-mix(in oklab, var(--ring) 50%, transparent)",
    outline: "1px solid",
  },
});

export const scrollbar = style("scroll-area-scrollbar", {
  display: "flex",
  padding: "1px",
  touchAction: "none",
  userSelect: "none",
  transitionProperty: "color, background-color, border-color, outline-color, text-decoration-color, fill, stroke",
  transitionDuration: "150ms",
  transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
  "&[data-orientation='vertical']": {
    position: "absolute",
    top: "0",
    right: "0",
    height: "100%",
    width: "0.625rem",
    borderLeft: "1px solid transparent",
  },
  "&[data-orientation='horizontal']": {
    position: "absolute",
    bottom: "0",
    left: "0",
    width: "100%",
    height: "0.625rem",
    flexDirection: "column",
    borderTop: "1px solid transparent",
  },
});

export const thumb = style("scroll-area-thumb", {
  position: "relative",
  flex: "1 1 0%",
  borderRadius: "9999px",
  backgroundColor: "var(--border)",
});

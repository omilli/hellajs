import { css, cssVars } from "../../../packages/css";
import { colors } from "./color";
import { size } from "./utils";

export const scale = cssVars({
  lg: 1.25,
  md: 1,
  sm: 0.875,
}, { prefix: "scale" });

css({
  "*, *::before, *::after": {
    boxSizing: "border-box"
  },
  body: {
    lineHeight: 1.5,
    WebkitFontSmoothing: "antialiased",
    backgroundColor: colors.neutral[100],
    color: colors.neutral[900],
    margin: 0,
    fontFamily: "sans-serif",
    fontSize: size(16, "px"),
    fontWeight: 400
  },
  "body, h1, h2, h3, h4, h5, h6, p, figure, blockquote, dl, dd": {
    margin: 0
  },
  "img, picture, video, canvas, svg": {
    display: "block",
    maxWidth: "100%"
  },
  "input, button, textarea, select": {
    font: "inherit"
  },
  "p, h1, h2, h3, h4, h5, h6": {
    overflowWrap: "break-word"
  }
}, { global: true });
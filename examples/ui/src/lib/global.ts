import { css, cssVars } from "@hellajs/css";

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
    margin: 0,
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
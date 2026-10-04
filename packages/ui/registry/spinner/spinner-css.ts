import { keyframes, style } from "@hellajs/css";

const spin = keyframes({
  to: { transform: "rotate(360deg)" },
});

export const base = style({
  animation: `${spin} 1s linear infinite`,
  height: "1rem",
  width: "1rem",
}, { label: "spinner" });

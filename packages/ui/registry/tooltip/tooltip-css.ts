import { keyframes, style } from "@hellajs/css";

// tw-animate-css equivalents, hand-rolled: the enter composes fade +
// zoom(95%) with the side's slide direction (named by the data-side value
// that applies it), the exit is fade + zoom without slide.
const inTop = keyframes({ from: { opacity: "0", transform: "translateY(0.5rem) scale(0.95)" } });
const inBottom = keyframes({ from: { opacity: "0", transform: "translateY(-0.5rem) scale(0.95)" } });
const inLeft = keyframes({ from: { opacity: "0", transform: "translateX(0.5rem) scale(0.95)" } });
const inRight = keyframes({ from: { opacity: "0", transform: "translateX(-0.5rem) scale(0.95)" } });
const out = keyframes({ to: { opacity: "0", transform: "scale(0.95)" } });

export const base = "";

export const content = style({
  backgroundColor: "var(--foreground)",
  borderRadius: "calc(var(--radius) * 0.8)",
  color: "var(--background)",
  fontSize: "0.75rem",
  lineHeight: "1rem",
  paddingBlock: "0.375rem",
  paddingInline: "0.75rem",
  textWrap: "balance",
  transformOrigin: "var(--radix-tooltip-content-transform-origin)",
  width: "fit-content",
  zIndex: "50",
  "&[data-state='open'][data-side='top']": {
    animation: `${inTop} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='bottom']": {
    animation: `${inBottom} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='left']": {
    animation: `${inLeft} 150ms ease-out both`,
  },
  "&[data-state='open'][data-side='right']": {
    animation: `${inRight} 150ms ease-out both`,
  },
  "&[data-state='closed']": {
    animation: `${out} 150ms ease-in both`,
  },
}, { label: "hella-tooltip-content", layer: "hella" });

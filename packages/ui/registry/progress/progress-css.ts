import { keyframes, style } from "@hellajs/css";

const indeterminate = keyframes({
  from: { transform: "translateX(-100%)" },
  to: { transform: "translateX(0)" },
});

export const base = style("progress", {
  backgroundColor: "color-mix(in oklab, var(--primary) 20%, transparent)",
  borderRadius: "calc(infinity * 1px)",
  height: "0.5rem",
  overflow: "hidden",
  position: "relative",
  width: "100%",
});

export const indicator = style("progress-indicator", {
  backgroundColor: "var(--primary)",
  flex: "1",
  height: "100%",
  transition: "all 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "100%",
  "&[data-state='indeterminate']": {
    animation: `${indeterminate} 2s linear infinite`,
  },
});

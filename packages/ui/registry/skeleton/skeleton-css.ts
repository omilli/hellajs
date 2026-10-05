import { keyframes, style } from "@hellajs/css";

const pulse = keyframes({
  "50%": { opacity: "0.5" },
});

export const base = style("skeleton", {
  animation: `${pulse} 2s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
  backgroundColor: "var(--accent)",
  borderRadius: "calc(var(--radius) * 0.8)",
});

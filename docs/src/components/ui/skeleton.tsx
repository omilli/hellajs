import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface SkeletonProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

import { keyframes, style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const pulse = keyframes({
  "50%": { opacity: "0.5" },
});

const base = style("skeleton", {
  animation: `${pulse} 2s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
  backgroundColor: tokens.accent,
  borderRadius: `calc(${tokens.radius} * 0.8)`,
});

export function Skeleton({ children, class: cls, ...attrs }: SkeletonProps): JSX.Element {
  return (
    <div
      data-slot="skeleton"
      class={
        [base, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

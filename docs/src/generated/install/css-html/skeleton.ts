import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";

import { keyframes, style } from "@hellajs/css";

const pulse = keyframes({
  "50%": { opacity: "0.5" },
});

const base = style("skeleton", {
  animation: `${pulse} 2s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
  backgroundColor: "var(--accent)",
  borderRadius: "calc(var(--radius) * 0.8)",
});

interface SkeletonProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export default function Skeleton({ children, class: cls, ...attrs }: SkeletonProps): HellaNode {
  return html`
    <div
      data-slot="skeleton"
      class="${
        [base, cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

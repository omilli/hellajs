import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

import { keyframes, style } from "@hellajs/css";

const pulse = keyframes({
  "50%": { opacity: "0.5" },
});

const base = style({
  animation: `${pulse} 2s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
  backgroundColor: "var(--accent)",
  borderRadius: "calc(var(--radius) * 0.8)",
}, { label: "hella-skeleton", layer: "hella" });

interface SkeletonProps {
  children?: HellaChildren;
  class?: string;
}

export default function Skeleton(props: SkeletonProps): HellaNode {
  return html`
    <div
      data-slot="skeleton"
      class="${
        [base, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

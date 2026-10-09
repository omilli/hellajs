import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

interface SkeletonProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export default function Skeleton({ children, class: cls, ...attrs }: SkeletonProps): HellaNode {
  return html`
    <div
      data-slot="skeleton"
      class="${
        cn("animate-pulse rounded-md bg-accent", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

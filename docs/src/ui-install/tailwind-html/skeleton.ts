import { html } from "@hellajs/dom";
import type { HellaNode, HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface SkeletonProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}
import { cn } from "./cn.js";

export function Skeleton({ children, class: cls, ...attrs }: SkeletonProps): HellaNode {
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

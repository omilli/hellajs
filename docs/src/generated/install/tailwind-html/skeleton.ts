import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

interface SkeletonProps {
  children?: HellaChildren;
  class?: string;
}

export default function Skeleton(props: SkeletonProps): HellaNode {
  return html`
    <div
      data-slot="skeleton"
      class="${
        cn("animate-pulse rounded-md bg-accent", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

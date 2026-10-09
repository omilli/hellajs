import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
// @hella:end

interface SkeletonProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export default function Skeleton({ children, class: cls, ...attrs }: SkeletonProps): HellaNode {
  return html`
    <div
      data-slot="skeleton"
      class="${
        // @hella:compose
        [base, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

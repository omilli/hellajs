import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
// @hella:end

interface SkeletonProps {
  children?: HellaChildren;
  class?: string;
}

export default function Skeleton(props: SkeletonProps): HellaNode {
  return html`
    <div
      data-slot="skeleton"
      class="${
        // @hella:compose
        [base, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

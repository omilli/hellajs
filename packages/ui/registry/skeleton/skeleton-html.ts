import { html } from "@hellajs/dom";
import type { HellaNode } from "@hellajs/dom";
import type { SkeletonProps } from "./skeleton-types.js";

// @hella:styles
declare const base: string;
// @hella:end

export function Skeleton({ children, class: cls, ...attrs }: SkeletonProps): HellaNode {
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

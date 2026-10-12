import { html } from "@hellajs/dom";
import type { HellaNode } from "@hellajs/dom";
import type { AspectRatioProps } from "./aspect-ratio-types.js";

// @hella:styles
declare const base: string;
// @hella:end

export function AspectRatio({ ratio, children, class: cls, ...attrs }: AspectRatioProps): HellaNode {
  return html`
    <div
      data-slot="aspect-ratio"
      style="aspect-ratio:${ratio ?? 1}; width:100%"
      class="${
        // @hella:compose
        [base, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

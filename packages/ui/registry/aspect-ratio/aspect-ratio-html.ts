import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
// @hella:end

interface AspectRatioProps {
  ratio?: number;
  children?: HellaChildren;
  class?: string;
}

export default function AspectRatio(props: AspectRatioProps): HellaNode {
  return html`
    <div
      data-slot="aspect-ratio"
      style="aspect-ratio:${props.ratio ?? 1}; width:100%"
      class="${
        // @hella:compose
        [base, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

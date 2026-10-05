import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

import { style } from "@hellajs/css";

const base = style("aspect-ratio", {
  position: "relative",
});

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
        [base, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

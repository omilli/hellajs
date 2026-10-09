import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

interface AspectRatioProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  ratio?: number;
}

export default function AspectRatio({ ratio, children, class: cls, ...attrs }: AspectRatioProps): HellaNode {
  return html`
    <div
      data-slot="aspect-ratio"
      style="aspect-ratio:${ratio ?? 1}; width:100%"
      class="${
        cn("relative", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

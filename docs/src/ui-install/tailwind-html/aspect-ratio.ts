import { html } from "@hellajs/dom";
import type { HellaNode, HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface AspectRatioProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  ratio?: number;
}
import { cn } from "./cn.js";

export function AspectRatio({ ratio, children, class: cls, ...attrs }: AspectRatioProps): HellaNode {
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

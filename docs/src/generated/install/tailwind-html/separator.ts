import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

interface SeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  orientation?: "horizontal" | "vertical";
}

export default function Separator({ orientation, children, class: cls, ...attrs }: SeparatorProps): HellaNode {
  return html`
    <div
      data-slot="separator"
      role="separator"
      data-orientation="${orientation ?? "horizontal"}"
      aria-orientation="${orientation ?? "horizontal"}"
      class="${
        cn("shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

import { html } from "@hellajs/dom";
import type { HellaNode, HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface SeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  orientation?: "horizontal" | "vertical";
}
import { cn } from "./cn.js";

export function Separator({ orientation, children, class: cls, ...attrs }: SeparatorProps): HellaNode {
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

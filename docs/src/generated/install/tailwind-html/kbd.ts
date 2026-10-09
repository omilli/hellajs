import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

interface KbdProps extends HTMLAttributes<"kbd"> {
  class?: string;
  children?: HellaChildren;
}

export default function Kbd({ children, class: cls, ...attrs }: KbdProps): HellaNode {
  return html`
    <kbd
      data-slot="kbd"
      class="${
        cn("pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none [&_svg:not([class*='size-'])]:size-3 [[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10", cls)
      }"
      ...${attrs}
    >${() => children}</kbd>
  ` as HellaNode;
}

export function KbdGroup({ children, class: cls, ...attrs }: KbdProps): HellaNode {
  return html`
    <kbd
      data-slot="kbd-group"
      class="${
        cn("inline-flex items-center gap-1", cls)
      }"
      ...${attrs}
    >${() => children}</kbd>
  ` as HellaNode;
}

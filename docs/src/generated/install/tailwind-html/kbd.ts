import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

interface KbdProps {
  children?: HellaChildren;
  class?: string;
}

export default function Kbd(props: KbdProps): HellaNode {
  return html`
    <kbd
      data-slot="kbd"
      class="${
        cn("pointer-events-none inline-flex h-5 w-fit min-w-5 items-center justify-center gap-1 rounded-sm bg-muted px-1 font-sans text-xs font-medium text-muted-foreground select-none [&_svg:not([class*='size-'])]:size-3 [[data-slot=tooltip-content]_&]:bg-background/20 [[data-slot=tooltip-content]_&]:text-background dark:[[data-slot=tooltip-content]_&]:bg-background/10", props.class)
      }"
    >${() => props.children}</kbd>
  ` as HellaNode;
}

export function KbdGroup(props: KbdProps): HellaNode {
  return html`
    <kbd
      data-slot="kbd-group"
      class="${
        cn("inline-flex items-center gap-1", props.class)
      }"
    >${() => props.children}</kbd>
  ` as HellaNode;
}

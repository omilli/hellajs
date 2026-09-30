import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

const variants: Record<string, string> = {
  separator: "before:mr-1 before:h-px before:min-w-0 before:flex-1 before:bg-border after:ml-1 after:h-px after:min-w-0 after:flex-1 after:bg-border",
  border: "border-b border-border pb-2",
};

interface MarkerProps {
  children?: HellaChildren;
  variant?: "default" | "separator" | "border";
  class?: string;
}

export default function Marker(props: MarkerProps): HellaNode {
  return html`
    <div
      data-slot="marker"
      data-variant="${props.variant ?? "default"}"
      class="${
        cn(
          "group/marker relative flex min-h-4 w-full items-center gap-2 text-left text-sm text-muted-foreground [&_svg:not([class*='size-'])]:size-4 [a]:underline [a]:underline-offset-3 [a]:hover:text-foreground",
          variants[props.variant ?? "default"],
          props.class,
        )
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface MarkerIconProps {
  children?: HellaChildren;
  class?: string;
}

export function MarkerIcon(props: MarkerIconProps): HellaNode {
  return html`
    <span
      data-slot="marker-icon"
      aria-hidden="true"
      class="${
        cn("size-4 shrink-0 [&_svg:not([class*='size-'])]:size-4", props.class)
      }"
    >${() => props.children}</span>
  ` as HellaNode;
}

interface MarkerContentProps {
  children?: HellaChildren;
  class?: string;
}

export function MarkerContent(props: MarkerContentProps): HellaNode {
  return html`
    <span
      data-slot="marker-content"
      class="${
        cn("min-w-0 wrap-break-word group-data-[variant=separator]/marker:flex-none group-data-[variant=separator]/marker:text-center *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground", props.class)
      }"
    >${() => props.children}</span>
  ` as HellaNode;
}

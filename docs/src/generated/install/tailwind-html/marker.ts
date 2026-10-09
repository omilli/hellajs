import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

const variants: Record<string, string> = {
  separator: "before:mr-1 before:h-px before:min-w-0 before:flex-1 before:bg-border after:ml-1 after:h-px after:min-w-0 after:flex-1 after:bg-border",
  border: "border-b border-border pb-2",
};

interface MarkerProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "separator" | "border";
}

export default function Marker({ variant, children, class: cls, ...attrs }: MarkerProps): HellaNode {
  return html`
    <div
      data-slot="marker"
      data-variant="${variant ?? "default"}"
      class="${
        cn(
          "group/marker relative flex min-h-4 w-full items-center gap-2 text-left text-sm text-muted-foreground [&_svg:not([class*='size-'])]:size-4 [a]:underline [a]:underline-offset-3 [a]:hover:text-foreground",
          variants[variant ?? "default"],
          cls,
        )
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface MarkerIconProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

export function MarkerIcon({ children, class: cls, ...attrs }: MarkerIconProps): HellaNode {
  return html`
    <span
      data-slot="marker-icon"
      aria-hidden="true"
      class="${
        cn("size-4 shrink-0 [&_svg:not([class*='size-'])]:size-4", cls)
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

interface MarkerContentProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}

export function MarkerContent({ children, class: cls, ...attrs }: MarkerContentProps): HellaNode {
  return html`
    <span
      data-slot="marker-content"
      class="${
        cn("min-w-0 wrap-break-word group-data-[variant=separator]/marker:flex-none group-data-[variant=separator]/marker:text-center *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground", cls)
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

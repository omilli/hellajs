import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

const mediaVariants = {
  default: "bg-transparent",
  icon: "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*='size-'])]:size-6",
};

interface EmptyPartProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export default function Empty({ children, class: cls, ...attrs }: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty"
      class="${
        cn("flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border-dashed p-6 text-center text-balance md:p-12", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function EmptyHeader({ children, class: cls, ...attrs }: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty-header"
      class="${
        cn("flex max-w-sm flex-col items-center gap-2 text-center", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

interface EmptyMediaProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "icon";
}

export function EmptyMedia({ variant, children, class: cls, ...attrs }: EmptyMediaProps): HellaNode {
  return html`
    <div
      data-slot="empty-icon"
      data-variant="${variant ?? "default"}"
      class="${
        cn(
          "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
          mediaVariants[variant ?? "default"],
          cls,
        )
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function EmptyTitle({ children, class: cls, ...attrs }: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty-title"
      class="${
        cn("text-lg font-medium tracking-tight", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function EmptyDescription({ children, class: cls, ...attrs }: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty-description"
      class="${
        cn("text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function EmptyContent({ children, class: cls, ...attrs }: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty-content"
      class="${
        cn("flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

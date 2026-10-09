import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

interface CardPartProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export default function Card({ children, class: cls, ...attrs }: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card"
      class="${
        cn("flex flex-col gap-6 rounded-xl border bg-card py-6 text-card-foreground shadow-sm", cls)
      }"
      ...${attrs}
    >${children}</div>
  ` as HellaNode;
}

export function CardHeader({ children, class: cls, ...attrs }: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card-header"
      class="${
        cn("@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6", cls)
      }"
      ...${attrs}
    >${children}</div>
  ` as HellaNode;
}

export function CardTitle({ children, class: cls, ...attrs }: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card-title"
      class="${
        cn("leading-none font-semibold", cls)
      }"
      ...${attrs}
    >${children}</div>
  ` as HellaNode;
}

export function CardDescription({ children, class: cls, ...attrs }: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card-description"
      class="${
        cn("text-sm text-muted-foreground", cls)
      }"
      ...${attrs}
    >${children}</div>
  ` as HellaNode;
}

export function CardAction({ children, class: cls, ...attrs }: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card-action"
      class="${
        cn("col-start-2 row-span-2 row-start-1 self-start justify-self-end", cls)
      }"
      ...${attrs}
    >${children}</div>
  ` as HellaNode;
}

export function CardContent({ children, class: cls, ...attrs }: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card-content"
      class="${
        cn("px-6", cls)
      }"
      ...${attrs}
    >${children}</div>
  ` as HellaNode;
}

export function CardFooter({ children, class: cls, ...attrs }: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card-footer"
      class="${
        cn("flex items-center px-6 [.border-t]:pt-6", cls)
      }"
      ...${attrs}
    >${children}</div>
  ` as HellaNode;
}

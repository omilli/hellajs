import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

const mediaVariants = {
  default: "bg-transparent",
  icon: "flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground [&_svg:not([class*='size-'])]:size-6",
};

interface EmptyPartProps {
  children?: HellaChildren;
  class?: string;
}

export default function Empty(props: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty"
      class="${
        cn("flex min-w-0 flex-1 flex-col items-center justify-center gap-6 rounded-lg border-dashed p-6 text-center text-balance md:p-12", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function EmptyHeader(props: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty-header"
      class="${
        cn("flex max-w-sm flex-col items-center gap-2 text-center", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface EmptyMediaProps {
  children?: HellaChildren;
  variant?: "default" | "icon";
  class?: string;
}

export function EmptyMedia(props: EmptyMediaProps): HellaNode {
  return html`
    <div
      data-slot="empty-icon"
      data-variant="${props.variant ?? "default"}"
      class="${
        cn(
          "mb-2 flex shrink-0 items-center justify-center [&_svg]:pointer-events-none [&_svg]:shrink-0",
          mediaVariants[props.variant ?? "default"],
          props.class,
        )
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function EmptyTitle(props: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty-title"
      class="${
        cn("text-lg font-medium tracking-tight", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function EmptyDescription(props: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty-description"
      class="${
        cn("text-sm/relaxed text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function EmptyContent(props: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty-content"
      class="${
        cn("flex w-full max-w-sm min-w-0 flex-col items-center gap-4 text-sm text-balance", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

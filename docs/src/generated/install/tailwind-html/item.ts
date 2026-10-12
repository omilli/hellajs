import { html } from "@hellajs/dom";
import type { HellaNode, HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface ItemGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

interface ItemSeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
}

interface ItemProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "outline" | "muted";
  size?: "default" | "sm";
  /** Static boolean or reactive fn; drives data-selected + aria-selected (omitted when absent). */
  selected?: boolean | (() => boolean);
}

interface ItemMediaProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "icon" | "image";
}

interface ItemContentProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

interface ItemTitleProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

interface ItemDescriptionProps extends HTMLAttributes<"p"> {
  class?: string;
  children?: HellaChildren;
}

interface ItemActionsProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

interface ItemHeaderProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

interface ItemFooterProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}
import { cn } from "./cn.js";

const variants = {
  default: "bg-transparent",
  outline: "border-border",
  muted: "bg-muted/50",
};

const sizes = {
  default: "gap-4 p-4",
  sm: "gap-2.5 px-4 py-3",
};

const mediaVariants = {
  default: "bg-transparent",
  icon: "size-8 rounded-sm border bg-muted [&_svg:not([class*='size-'])]:size-4",
  image: "size-10 overflow-hidden rounded-sm [&_img]:size-full [&_img]:object-cover",
};

export function ItemGroup({ children, class: cls, ...attrs }: ItemGroupProps): HellaNode {
  return html`
    <div
      role="list"
      data-slot="item-group"
      class="${
        cn("group/item-group flex flex-col", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function ItemSeparator({ class: cls, ...attrs }: ItemSeparatorProps): HellaNode {
  return html`
    <div
      role="separator"
      data-slot="item-separator"
      data-orientation="horizontal"
      aria-orientation="horizontal"
      class="${
        cn(
          "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
          "my-0",
          cls,
        )
      }"
      ...${attrs}
    ></div>
  ` as HellaNode;
}

export function Item({ variant, size, selected, children, class: cls, ...attrs }: ItemProps): HellaNode {
  const selectedAttr = (): "true" | "false" =>
    (typeof selected === "function" ? selected() : selected) ? "true" : "false";
  return html`
    <div
      data-slot="item"
      data-variant="${variant ?? "default"}"
      data-size="${size ?? "default"}"
      data-selected="${selectedAttr}"
      aria-selected="${selectedAttr}"
      class="${
        cn(
          "group/item flex flex-wrap items-center rounded-md border border-transparent text-sm transition-colors duration-100 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [a]:transition-colors [a]:hover:bg-accent/50",
          variants[variant ?? "default"],
          sizes[size ?? "default"],
          cls,
        )
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function ItemMedia({ variant, children, class: cls, ...attrs }: ItemMediaProps): HellaNode {
  return html`
    <div
      data-slot="item-media"
      data-variant="${variant ?? "default"}"
      class="${
        cn(
          "flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none",
          mediaVariants[variant ?? "default"],
          cls,
        )
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function ItemContent({ children, class: cls, ...attrs }: ItemContentProps): HellaNode {
  return html`
    <div
      data-slot="item-content"
      class="${
        cn("flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function ItemTitle({ children, class: cls, ...attrs }: ItemTitleProps): HellaNode {
  return html`
    <div
      data-slot="item-title"
      class="${
        cn("flex w-fit items-center gap-2 text-sm leading-snug font-medium", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function ItemDescription({ children, class: cls, ...attrs }: ItemDescriptionProps): HellaNode {
  return html`
    <p
      data-slot="item-description"
      class="${
        cn("line-clamp-2 text-sm leading-normal font-normal text-balance text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary", cls)
      }"
      ...${attrs}
    >${() => children}</p>
  ` as HellaNode;
}

export function ItemActions({ children, class: cls, ...attrs }: ItemActionsProps): HellaNode {
  return html`
    <div
      data-slot="item-actions"
      class="${
        cn("flex items-center gap-2", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function ItemHeader({ children, class: cls, ...attrs }: ItemHeaderProps): HellaNode {
  return html`
    <div
      data-slot="item-header"
      class="${
        cn("flex basis-full items-center justify-between gap-2", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function ItemFooter({ children, class: cls, ...attrs }: ItemFooterProps): HellaNode {
  return html`
    <div
      data-slot="item-footer"
      class="${
        cn("flex basis-full items-center justify-between gap-2", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

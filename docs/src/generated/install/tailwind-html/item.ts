import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";
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

interface ItemGroupProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemGroup(props: ItemGroupProps): HellaNode {
  return html`
    <div
      role="list"
      data-slot="item-group"
      class="${
        cn("group/item-group flex flex-col", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ItemSeparatorProps {
  class?: string;
}

export function ItemSeparator(props: ItemSeparatorProps): HellaNode {
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
          props.class,
        )
      }"
    ></div>
  ` as HellaNode;
}

interface ItemProps {
  children?: HellaChildren;
  variant?: "default" | "outline" | "muted";
  size?: "default" | "sm";
  /** Static boolean or reactive fn; drives data-selected + aria-selected (omitted when absent). */
  selected?: boolean | (() => boolean);
  class?: string;
}

export function Item(props: ItemProps): HellaNode {
  const selectedAttr = (): "true" | "false" =>
    (typeof props.selected === "function" ? props.selected() : props.selected) ? "true" : "false";
  return html`
    <div
      data-slot="item"
      data-variant="${props.variant ?? "default"}"
      data-size="${props.size ?? "default"}"
      data-selected="${selectedAttr}"
      aria-selected="${selectedAttr}"
      class="${
        cn(
          "group/item flex flex-wrap items-center rounded-md border border-transparent text-sm transition-colors duration-100 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 [a]:transition-colors [a]:hover:bg-accent/50",
          variants[props.variant ?? "default"],
          sizes[props.size ?? "default"],
          props.class,
        )
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ItemMediaProps {
  children?: HellaChildren;
  variant?: "default" | "icon" | "image";
  class?: string;
}

export function ItemMedia(props: ItemMediaProps): HellaNode {
  return html`
    <div
      data-slot="item-media"
      data-variant="${props.variant ?? "default"}"
      class="${
        cn(
          "flex shrink-0 items-center justify-center gap-2 group-has-[[data-slot=item-description]]/item:translate-y-0.5 group-has-[[data-slot=item-description]]/item:self-start [&_svg]:pointer-events-none",
          mediaVariants[props.variant ?? "default"],
          props.class,
        )
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ItemContentProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemContent(props: ItemContentProps): HellaNode {
  return html`
    <div
      data-slot="item-content"
      class="${
        cn("flex flex-1 flex-col gap-1 [&+[data-slot=item-content]]:flex-none", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ItemTitleProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemTitle(props: ItemTitleProps): HellaNode {
  return html`
    <div
      data-slot="item-title"
      class="${
        cn("flex w-fit items-center gap-2 text-sm leading-snug font-medium", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ItemDescriptionProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemDescription(props: ItemDescriptionProps): HellaNode {
  return html`
    <p
      data-slot="item-description"
      class="${
        cn("line-clamp-2 text-sm leading-normal font-normal text-balance text-muted-foreground [&>a]:underline [&>a]:underline-offset-4 [&>a:hover]:text-primary", props.class)
      }"
    >${() => props.children}</p>
  ` as HellaNode;
}

interface ItemActionsProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemActions(props: ItemActionsProps): HellaNode {
  return html`
    <div
      data-slot="item-actions"
      class="${
        cn("flex items-center gap-2", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ItemHeaderProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemHeader(props: ItemHeaderProps): HellaNode {
  return html`
    <div
      data-slot="item-header"
      class="${
        cn("flex basis-full items-center justify-between gap-2", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ItemFooterProps {
  children?: HellaChildren;
  class?: string;
}

export function ItemFooter(props: ItemFooterProps): HellaNode {
  return html`
    <div
      data-slot="item-footer"
      class="${
        cn("flex basis-full items-center justify-between gap-2", props.class)
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

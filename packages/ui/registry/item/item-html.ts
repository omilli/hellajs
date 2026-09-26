import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const actions: string;
declare const base: string;
declare const content: string;
declare const description: string;
declare const footer: string;
declare const group: string;
declare const header: string;
declare const media: string;
declare const mediaVariants: Record<string, string>;
declare const separator: string;
declare const separatorBase: string;
declare const sizes: Record<string, string>;
declare const title: string;
declare const variants: Record<string, string>;
// @hella:end

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
        // @hella:compose
        [group, props.class]
        // @hella:end
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
        // @hella:compose
        [
          separatorBase,
          separator,
          props.class,
        ]
        // @hella:end
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
        // @hella:compose
        [
          base,
          variants[props.variant ?? "default"],
          sizes[props.size ?? "default"],
          props.class,
        ]
        // @hella:end
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
        // @hella:compose
        [
          media,
          mediaVariants[props.variant ?? "default"],
          props.class,
        ]
        // @hella:end
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
        // @hella:compose
        [content, props.class]
        // @hella:end
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
        // @hella:compose
        [title, props.class]
        // @hella:end
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
        // @hella:compose
        [description, props.class]
        // @hella:end
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
        // @hella:compose
        [actions, props.class]
        // @hella:end
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
        // @hella:compose
        [header, props.class]
        // @hella:end
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
        // @hella:compose
        [footer, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

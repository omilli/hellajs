import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
// @hella:end

interface EmptyPartProps {
  children?: HellaChildren;
  class?: string;
}

export default function Empty(props: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty"
      class="${
        // @hella:compose
        [base, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function EmptyHeader(props: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty-header"
      class="${
        // @hella:compose
        [header, props.class]
        // @hella:end
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

export function EmptyTitle(props: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty-title"
      class="${
        // @hella:compose
        [title, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function EmptyDescription(props: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty-description"
      class="${
        // @hella:compose
        [description, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function EmptyContent(props: EmptyPartProps): HellaNode {
  return html`
    <div
      data-slot="empty-content"
      class="${
        // @hella:compose
        [content, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

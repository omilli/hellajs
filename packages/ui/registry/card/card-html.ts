import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
// @hella:end

interface CardPartProps {
  children?: HellaChildren;
  class?: string;
}

export default function Card(props: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card"
      class="${
        // @hella:compose
        [base, props.class]
        // @hella:end
      }"
    >${props.children}</div>
  ` as HellaNode;
}

export function CardHeader(props: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card-header"
      class="${
        // @hella:compose
        [header, props.class]
        // @hella:end
      }"
    >${props.children}</div>
  ` as HellaNode;
}

export function CardTitle(props: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card-title"
      class="${
        // @hella:compose
        [title, props.class]
        // @hella:end
      }"
    >${props.children}</div>
  ` as HellaNode;
}

export function CardDescription(props: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card-description"
      class="${
        // @hella:compose
        [description, props.class]
        // @hella:end
      }"
    >${props.children}</div>
  ` as HellaNode;
}

export function CardAction(props: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card-action"
      class="${
        // @hella:compose
        [action, props.class]
        // @hella:end
      }"
    >${props.children}</div>
  ` as HellaNode;
}

export function CardContent(props: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card-content"
      class="${
        // @hella:compose
        [content, props.class]
        // @hella:end
      }"
    >${props.children}</div>
  ` as HellaNode;
}

export function CardFooter(props: CardPartProps): HellaNode {
  return html`
    <div
      data-slot="card-footer"
      class="${
        // @hella:compose
        [footer, props.class]
        // @hella:end
      }"
    >${props.children}</div>
  ` as HellaNode;
}

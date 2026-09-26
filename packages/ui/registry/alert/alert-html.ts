import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const description: string;
declare const title: string;
declare const variants: Record<string, string>;
// @hella:end

interface AlertProps {
  children?: HellaChildren;
  variant?: "default" | "destructive";
  class?: string;
}

export default function Alert(props: AlertProps): HellaNode {
  return html`
    <div
      data-slot="alert"
      role="alert"
      class="${
        // @hella:compose
        [
          base,
          variants[props.variant ?? "default"],
          props.class,
        ]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface AlertPartProps {
  children?: HellaChildren;
  class?: string;
}

export function AlertTitle(props: AlertPartProps): HellaNode {
  return html`
    <div
      data-slot="alert-title"
      class="${
        // @hella:compose
        [title, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function AlertDescription(props: AlertPartProps): HellaNode {
  return html`
    <div
      data-slot="alert-description"
      class="${
        // @hella:compose
        [description, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

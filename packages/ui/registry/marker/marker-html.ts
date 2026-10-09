import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const content: string;
declare const icon: string;
declare const variants: Record<string, string>;
// @hella:end

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
        // @hella:compose
        [
          base,
          variants[variant ?? "default"],
          cls,
        ]
        // @hella:end
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
        // @hella:compose
        [icon, cls]
        // @hella:end
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
        // @hella:compose
        [content, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</span>
  ` as HellaNode;
}

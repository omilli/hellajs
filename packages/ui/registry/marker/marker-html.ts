import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
// @hella:end

interface MarkerProps {
  children?: HellaChildren;
  variant?: "default" | "separator" | "border";
  class?: string;
}

export default function Marker(props: MarkerProps): HellaNode {
  return html`
    <div
      data-slot="marker"
      data-variant="${props.variant ?? "default"}"
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

interface MarkerIconProps {
  children?: HellaChildren;
  class?: string;
}

export function MarkerIcon(props: MarkerIconProps): HellaNode {
  return html`
    <span
      data-slot="marker-icon"
      aria-hidden="true"
      class="${
        // @hella:compose
        [icon, props.class]
        // @hella:end
      }"
    >${() => props.children}</span>
  ` as HellaNode;
}

interface MarkerContentProps {
  children?: HellaChildren;
  class?: string;
}

export function MarkerContent(props: MarkerContentProps): HellaNode {
  return html`
    <span
      data-slot="marker-content"
      class="${
        // @hella:compose
        [content, props.class]
        // @hella:end
      }"
    >${() => props.children}</span>
  ` as HellaNode;
}

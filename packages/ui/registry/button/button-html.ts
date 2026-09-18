import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
// @hella:end

interface ButtonProps {
  children?: HellaChildren;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
  ariaInvalid?: boolean;
  class?: string;
  onclick?: () => void;
}

export default function Button(props: ButtonProps): HellaNode {
  return html`
    <button
      data-slot="button"
      data-variant="${props.variant ?? "default"}"
      data-size="${props.size ?? "default"}"
      aria-invalid="${props.ariaInvalid ? "true" : undefined}"
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
      e:click="${() => props.onclick?.()}"
    >${props.children}</button>
  ` as HellaNode;
}

import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const variants: Record<string, string>;
// @hella:end

interface BadgeProps {
  children?: HellaChildren;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  ariaInvalid?: boolean;
  class?: string;
}

export default function Badge(props: BadgeProps): HellaNode {
  return html`
    <span
      data-slot="badge"
      data-variant="${props.variant ?? "default"}"
      aria-invalid="${props.ariaInvalid ? "true" : undefined}"
      class="${
        // @hella:compose
        [
          base,
          variants[props.variant ?? "default"],
          props.class,
        ]
        // @hella:end
      }"
    >${() => props.children}</span>
  ` as HellaNode;
}

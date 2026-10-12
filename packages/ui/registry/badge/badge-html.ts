import { html } from "@hellajs/dom";
import type { HellaNode } from "@hellajs/dom";
import type { BadgeProps } from "./badge-types.js";

// @hella:styles
declare const base: string;
declare const variants: Record<string, string>;
// @hella:end

export function Badge({ variant, children, class: cls, ...attrs }: BadgeProps): HellaNode {
  return html`
    <span
      data-slot="badge"
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
    >${() => children}</span>
  ` as HellaNode;
}

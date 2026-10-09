import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const focus: string;
declare const invalid: string;
// @hella:end

interface InputProps extends HTMLAttributes<"input"> {
  class?: string;
}

export default function Input({ class: cls, ...attrs }: InputProps): HellaNode {
  return html`
    <input
      data-slot="input"
      class="${
        // @hella:compose
        [
          base,
          focus,
          invalid,
          cls,
        ]
        // @hella:end
      }"
      ...${attrs}
    />
  ` as HellaNode;
}

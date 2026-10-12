import { html } from "@hellajs/dom";
import type { HellaNode } from "@hellajs/dom";
import type { InputProps } from "./input-types.js";

// @hella:styles
declare const base: string;
declare const focus: string;
declare const invalid: string;
// @hella:end

export function Input({ class: cls, ...attrs }: InputProps): HellaNode {
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

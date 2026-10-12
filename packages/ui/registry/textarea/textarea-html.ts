import { html } from "@hellajs/dom";
import type { HellaNode } from "@hellajs/dom";
import type { TextareaProps } from "./textarea-types.js";

// @hella:styles
declare const base: string;
declare const focus: string;
declare const invalid: string;
// @hella:end

export function Textarea({ class: cls, ...attrs }: TextareaProps): HellaNode {
  return html`
    <textarea
      data-slot="textarea"
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
    ></textarea>
  ` as HellaNode;
}

import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const focus: string;
declare const invalid: string;
// @hella:end

interface TextareaProps extends HTMLAttributes<"textarea"> {
  class?: string;
}

export default function Textarea({ class: cls, ...attrs }: TextareaProps): HellaNode {
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

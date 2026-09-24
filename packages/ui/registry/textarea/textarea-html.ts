import { html } from "@hellajs/dom";
import type { HellaNode } from "@hellajs/dom";

// @hella:styles
// @hella:end

interface TextareaProps {
  value?: string | (() => string);
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  rows?: number;
  ariaInvalid?: boolean;
  class?: string;
  oninput?: (v: string) => void;
}

export default function Textarea(props: TextareaProps): HellaNode {
  return html`
    <textarea
      data-slot="textarea"
      placeholder="${props.placeholder}"
      id="${props.id}"
      aria-label="${props.ariaLabel}"
      rows="${props.rows}"
      aria-invalid="${props.ariaInvalid ? "true" : undefined}"
      value="${props.value}"
      class="${
        // @hella:compose
        [
          base,
          focus,
          invalid,
          props.class,
        ]
        // @hella:end
      }"
      e:input="${(e: Event) => props.oninput?.((e.target as HTMLTextAreaElement).value)}"
    ></textarea>
  ` as HellaNode;
}

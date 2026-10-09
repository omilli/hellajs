import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
// @hella:end

interface LabelProps extends HTMLAttributes<"label"> {
  class?: string;
  children?: HellaChildren;
}

export default function Label({ children, class: cls, ...attrs }: LabelProps): HellaNode {
  return html`
    <label
      data-slot="label"
      class="${
        // @hella:compose
        [base, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</label>
  ` as HellaNode;
}

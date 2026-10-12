import { html } from "@hellajs/dom";
import type { HellaNode } from "@hellajs/dom";
import type { LabelProps } from "./label-types.js";

// @hella:styles
declare const base: string;
// @hella:end

export function Label({ children, class: cls, ...attrs }: LabelProps): HellaNode {
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

import { html } from "@hellajs/dom";
import type { HellaNode } from "@hellajs/dom";
import type { SeparatorProps } from "./separator-types.js";

// @hella:styles
declare const base: string;
// @hella:end

export function Separator({ orientation, children, class: cls, ...attrs }: SeparatorProps): HellaNode {
  return html`
    <div
      data-slot="separator"
      role="separator"
      data-orientation="${orientation ?? "horizontal"}"
      aria-orientation="${orientation ?? "horizontal"}"
      class="${
        // @hella:compose
        [base, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

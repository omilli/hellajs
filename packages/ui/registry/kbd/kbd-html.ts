import { html } from "@hellajs/dom";
import type { HellaNode } from "@hellajs/dom";
import type { KbdProps } from "./kbd-types.js";

// @hella:styles
declare const base: string;
declare const group: string;
// @hella:end

export function Kbd({ children, class: cls, ...attrs }: KbdProps): HellaNode {
  return html`
    <kbd
      data-slot="kbd"
      class="${
        // @hella:compose
        [base, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</kbd>
  ` as HellaNode;
}

export function KbdGroup({ children, class: cls, ...attrs }: KbdProps): HellaNode {
  return html`
    <kbd
      data-slot="kbd-group"
      class="${
        // @hella:compose
        [group, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</kbd>
  ` as HellaNode;
}

import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const group: string;
// @hella:end

interface KbdProps {
  children?: HellaChildren;
  class?: string;
}

export default function Kbd(props: KbdProps): HellaNode {
  return html`
    <kbd
      data-slot="kbd"
      class="${
        // @hella:compose
        [base, props.class]
        // @hella:end
      }"
    >${() => props.children}</kbd>
  ` as HellaNode;
}

export function KbdGroup(props: KbdProps): HellaNode {
  return html`
    <kbd
      data-slot="kbd-group"
      class="${
        // @hella:compose
        [group, props.class]
        // @hella:end
      }"
    >${() => props.children}</kbd>
  ` as HellaNode;
}

import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
declare const base: string;
// @hella:end

interface SeparatorProps {
  children?: HellaChildren;
  orientation?: "horizontal" | "vertical";
  class?: string;
}

export default function Separator(props: SeparatorProps): HellaNode {
  return html`
    <div
      data-slot="separator"
      role="separator"
      data-orientation="${props.orientation ?? "horizontal"}"
      aria-orientation="${props.orientation ?? "horizontal"}"
      class="${
        // @hella:compose
        [base, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

import { style } from "@hellajs/css";

const base = style({
  backgroundColor: "var(--border)",
  flexShrink: "0",
  "&[data-orientation='horizontal']": {
    height: "1px",
    width: "100%",
  },
  "&[data-orientation='vertical']": {
    height: "100%",
    width: "1px",
  },
}, { label: "hella-separator", layer: "hella" });

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
        [base, props.class]
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

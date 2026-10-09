import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";

import { style } from "@hellajs/css";

const base = style("separator", {
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
});

interface SeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  orientation?: "horizontal" | "vertical";
}

export default function Separator({ orientation, children, class: cls, ...attrs }: SeparatorProps): HellaNode {
  return html`
    <div
      data-slot="separator"
      role="separator"
      data-orientation="${orientation ?? "horizontal"}"
      aria-orientation="${orientation ?? "horizontal"}"
      class="${
        [base, cls]
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

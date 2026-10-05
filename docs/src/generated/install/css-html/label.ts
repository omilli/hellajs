import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

import { style } from "@hellajs/css";

const base = style("label", {
  alignItems: "center",
  display: "flex",
  fontSize: "0.875rem",
  fontWeight: "500",
  gap: "0.5rem",
  lineHeight: "1",
  userSelect: "none",
  "&:is(.group[data-disabled='true'] *)": {
    opacity: "0.5",
    pointerEvents: "none",
  },
  "&:is(.peer:disabled ~ *)": {
    cursor: "not-allowed",
    opacity: "0.5",
  },
});

interface LabelProps {
  children?: HellaChildren;
  for?: string;
  class?: string;
}

export default function Label(props: LabelProps): HellaNode {
  return html`
    <label
      data-slot="label"
      for="${props.for}"
      class="${
        [base, props.class]
      }"
    >${() => props.children}</label>
  ` as HellaNode;
}

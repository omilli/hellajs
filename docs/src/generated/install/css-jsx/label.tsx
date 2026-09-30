import type { HellaChildren } from "@hellajs/dom";

import { style } from "@hellajs/css";

const base = style({
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
}, { label: "hella-label", layer: "hella" });

interface LabelProps {
  children?: HellaChildren;
  for?: string;
  class?: string;
}

export default function Label(props: LabelProps): JSX.Element {
  return (
    <label
      data-slot="label"
      for={props.for}
      class={
        [base, props.class]
      }
    >
      {props.children}
    </label>
  );
}

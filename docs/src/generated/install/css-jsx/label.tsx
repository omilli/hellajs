import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface LabelProps extends HTMLAttributes<"label"> {
  class?: string;
  children?: HellaChildren;
}

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

export function Label({ children, class: cls, ...attrs }: LabelProps): JSX.Element {
  return (
    <label
      data-slot="label"
      class={
        [base, cls]
      }
      {...attrs}
    >
      {children}
    </label>
  );
}

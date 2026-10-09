import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

import { style } from "@hellajs/css";

const base = style("aspect-ratio", {
  position: "relative",
});

interface AspectRatioProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  ratio?: number;
}

export default function AspectRatio({ ratio, children, class: cls, ...attrs }: AspectRatioProps): JSX.Element {
  return (
    <div
      data-slot="aspect-ratio"
      style={{ aspectRatio: ratio ?? 1, width: "100%" }}
      class={
        [base, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

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
        cn("relative", cls)
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

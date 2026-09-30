import type { HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

interface AspectRatioProps {
  ratio?: number;
  children?: HellaChildren;
  class?: string;
}

export default function AspectRatio(props: AspectRatioProps): JSX.Element {
  return (
    <div
      data-slot="aspect-ratio"
      style={{ aspectRatio: props.ratio ?? 1, width: "100%" }}
      class={
        cn("relative", props.class)
      }
    >
      {props.children}
    </div>
  );
}

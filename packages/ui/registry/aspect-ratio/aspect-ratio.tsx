import type { HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const base: string;
// @hella:end

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
        // @hella:compose
        [base, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

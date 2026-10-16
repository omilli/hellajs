import type { AspectRatioProps } from "./aspect-ratio-types.js";

// @hella:styles
declare const base: string;
// @hella:end

export function AspectRatio({
  ratio,
  children,
  class: cls,
  ...attrs
}: AspectRatioProps): JSX.Element {
  return (
    <div
      data-slot="aspect-ratio"
      style={{ aspectRatio: ratio ?? 1, width: "100%" }}
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

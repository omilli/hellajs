import type { LabelProps } from "./label-types.js";

// @hella:styles
declare const base: string;
// @hella:end

export function Label({ children, class: cls, ...attrs }: LabelProps): JSX.Element {
  return (
    <label
      data-slot="label"
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </label>
  );
}

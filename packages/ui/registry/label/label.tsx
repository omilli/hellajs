import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const base: string;
// @hella:end

interface LabelProps extends HTMLAttributes<"label"> {
  class?: string;
  children?: HellaChildren;
}

export default function Label({ children, class: cls, ...attrs }: LabelProps): JSX.Element {
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

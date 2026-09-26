import type { HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const base: string;
// @hella:end

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
        // @hella:compose
        [base, props.class]
        // @hella:end
      }
    >
      {props.children}
    </label>
  );
}

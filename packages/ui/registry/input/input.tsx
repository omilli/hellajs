import type { HTMLAttributes } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const focus: string;
declare const invalid: string;
// @hella:end

interface InputProps extends HTMLAttributes<"input"> {
  class?: string;
}

export default function Input({ class: cls, ...attrs }: InputProps): JSX.Element {
  return (
    <input
      data-slot="input"
      class={
        // @hella:compose
        [
          base,
          focus,
          invalid,
          cls,
        ]
        // @hella:end
      }
      {...attrs}
    />
  );
}

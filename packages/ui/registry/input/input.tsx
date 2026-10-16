import type { InputProps } from "./input-types.js";

// @hella:styles
declare const base: string;
declare const focus: string;
declare const invalid: string;
// @hella:end

export function Input({ class: cls, ...attrs }: InputProps): JSX.Element {
  return (
    <input
      data-slot="input"
      class={
        // @hella:compose
        [base, focus, invalid, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

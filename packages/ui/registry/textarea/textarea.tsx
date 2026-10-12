import type { TextareaProps } from "./textarea-types.js";

// @hella:styles
declare const base: string;
declare const focus: string;
declare const invalid: string;
// @hella:end

export function Textarea({ class: cls, ...attrs }: TextareaProps): JSX.Element {
  return (
    <textarea
      data-slot="textarea"
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

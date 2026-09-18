import type { HellaNode } from "@hellajs/dom";

// @hella:styles
// @hella:end

interface InputProps {
  value?: string | (() => string);
  type?: string;
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  class?: string;
  oninput?: (v: string) => void;
}

export default function Input(props: InputProps): JSX.Element {
  return (
    <input
      data-slot="input"
      type={props.type}
      placeholder={props.placeholder}
      id={props.id}
      ariaLabel={props.ariaLabel}
      aria-invalid={props.ariaInvalid ? "true" : undefined}
      value={props.value}
      class={
        // @hella:compose
        [
          base,
          focus,
          invalid,
          props.class,
        ]
        // @hella:end
      }
      on:input={(e: Event) => props.oninput?.((e.target as HTMLInputElement).value)}
    />
  );
}

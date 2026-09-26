
// @hella:styles
declare const base: string;
declare const focus: string;
declare const invalid: string;
// @hella:end

interface TextareaProps {
  value?: string | (() => string);
  placeholder?: string;
  id?: string;
  ariaLabel?: string;
  rows?: number;
  ariaInvalid?: boolean;
  class?: string;
  oninput?: (v: string) => void;
}

export default function Textarea(props: TextareaProps): JSX.Element {
  return (
    <textarea
      data-slot="textarea"
      placeholder={props.placeholder}
      id={props.id}
      ariaLabel={props.ariaLabel}
      rows={props.rows}
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
      on:input={(e: Event) => props.oninput?.((e.target as HTMLTextAreaElement).value)}
    />
  );
}

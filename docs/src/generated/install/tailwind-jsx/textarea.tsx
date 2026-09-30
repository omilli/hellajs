import { cn } from "./cn.js";

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
        cn(
          "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
          props.class,
        )
      }
      on:input={(e: Event) => props.oninput?.((e.target as HTMLTextAreaElement).value)}
    />
  );
}

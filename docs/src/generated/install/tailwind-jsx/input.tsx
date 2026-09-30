import { cn } from "./cn.js";

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
        cn(
          "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none selection:bg-primary selection:text-primary-foreground file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
          props.class,
        )
      }
      on:input={(e: Event) => props.oninput?.((e.target as HTMLInputElement).value)}
    />
  );
}

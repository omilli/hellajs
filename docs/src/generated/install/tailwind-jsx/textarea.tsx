import type { HTMLAttributes } from "@hellajs/dom";
import { cn } from "./cn.js";

interface TextareaProps extends HTMLAttributes<"textarea"> {
  class?: string;
}

export default function Textarea({ class: cls, ...attrs }: TextareaProps): JSX.Element {
  return (
    <textarea
      data-slot="textarea"
      class={
        cn(
          "flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 md:text-sm dark:bg-input/30",
          "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50",
          "aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40",
          cls,
        )
      }
      {...attrs}
    />
  );
}

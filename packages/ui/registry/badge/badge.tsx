import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const variants: Record<string, string>;
// @hella:end

interface BadgeProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
}

export default function Badge({ variant, children, class: cls, ...attrs }: BadgeProps): JSX.Element {
  return (
    <span
      data-slot="badge"
      data-variant={variant ?? "default"}
      class={
        // @hella:compose
        [
          base,
          variants[variant ?? "default"],
          cls,
        ]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </span>
  );
}

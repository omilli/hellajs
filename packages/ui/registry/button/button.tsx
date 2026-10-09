import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const sizes: Record<string, string>;
declare const variants: Record<string, string>;
// @hella:end

interface ButtonProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}

export default function Button({ variant, size, children, class: cls, ...attrs }: ButtonProps): JSX.Element {
  return (
    <button
      data-slot="button"
      data-variant={variant ?? "default"}
      data-size={size ?? "default"}
      class={
        // @hella:compose
        [
          base,
          variants[variant ?? "default"],
          sizes[size ?? "default"],
          cls,
        ]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </button>
  );
}

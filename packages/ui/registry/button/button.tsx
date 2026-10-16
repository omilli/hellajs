import type { ButtonProps } from "./button-types.js";

// @hella:styles
declare const base: string;
declare const sizes: Record<string, string>;
declare const variants: Record<string, string>;
// @hella:end

export function Button({
  variant,
  size,
  children,
  class: cls,
  ...attrs
}: ButtonProps): JSX.Element {
  return (
    <button
      data-slot="button"
      data-variant={variant ?? "default"}
      data-size={size ?? "default"}
      class={
        // @hella:compose
        [base, variants[variant ?? "default"], sizes[size ?? "default"], cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </button>
  );
}

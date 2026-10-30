import { toggle } from "@hellajs/headless";
import type { ToggleProps } from "./toggle-types.js";

// @hella:styles
declare const base: string;
declare const sizes: Record<string, string>;
declare const variants: Record<string, string>;
// @hella:end

/** Resolves the toggle's full class from the spliced variant maps — the compose arrays' shared builder. */
export function toggleVariants(options?: {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  class?: string;
}): string {
  return [
    base,
    variants[options?.variant ?? "default"],
    sizes[options?.size ?? "default"],
    options?.class,
  ]
    .filter(Boolean)
    .join(" ");
}

export function Toggle({
  pressed,
  onPressedChange,
  variant,
  size,
  disabled,
  children,
  class: cls,
  ...attrs
}: ToggleProps): JSX.Element {
  const { Root } = toggle({ pressed, onPressedChange });
  return (
    <Root
      disabled={disabled}
      class={
        // @hella:compose
        [toggleVariants({ variant, size }), cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Root>
  );
}

import { signal } from "@hellajs/core";
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
  pressed: pressedProp,
  onPressedChange,
  variant,
  size,
  disabled,
  "on:click": userClick,
  children,
  class: cls,
  ...attrs
}: ToggleProps): JSX.Element {
  const pressedAccessor = typeof pressedProp === "function" ? pressedProp : undefined;
  const internal = signal(typeof pressedProp === "boolean" ? pressedProp : false);
  const pressed = (): boolean => (pressedAccessor ? pressedAccessor() : internal());

  const toggle = (): void => {
    if (disabled) return;
    const next = !pressed();
    if (!pressedAccessor) internal(next);
    onPressedChange?.(next);
  };

  return (
    <button
      type="button"
      data-slot="toggle"
      aria-pressed={pressed() ? "true" : "false"}
      data-state={pressed() ? "on" : "off"}
      disabled={disabled ? true : undefined}
      class={
        // @hella:compose
        [toggleVariants({ variant, size }), cls]
        // @hella:end
      }
      on:click={function (e) {
        userClick?.call(this, e);
        toggle();
      }}
      {...attrs}
    >
      {children}
    </button>
  );
}

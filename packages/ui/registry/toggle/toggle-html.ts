import { html } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
// @hella:end

interface ToggleProps {
  /** Pressed state. A boolean seeds the internal signal; an accessor makes the toggle controlled — clicks then only report through `onPressedChange`. */
  pressed?: boolean | (() => boolean);
  onPressedChange?: (pressed: boolean) => void;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  disabled?: boolean;
  class?: string;
  children?: HellaChildren;
}

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
  ].filter(Boolean).join(" ");
}

export default function Toggle(props: ToggleProps): HellaNode {
  const pressedAccessor = typeof props.pressed === "function" ? props.pressed : undefined;
  const internal = signal(typeof props.pressed === "boolean" ? props.pressed : false);
  const pressed = (): boolean => (pressedAccessor ? pressedAccessor() : internal());

  const toggle = (): void => {
    if (props.disabled) return;
    const next = !pressed();
    if (!pressedAccessor) internal(next);
    props.onPressedChange?.(next);
  };

  return html`
    <button
      type="button"
      data-slot="toggle"
      aria-pressed="${() => (pressed() ? "true" : "false")}"
      data-state="${() => (pressed() ? "on" : "off")}"
      disabled="${props.disabled ? true : undefined}"
      class="${
        // @hella:compose
        [toggleVariants({ variant: props.variant, size: props.size }), props.class]
        // @hella:end
      }"
      e:click="${() => toggle()}"
    >${() => props.children}</button>
  ` as HellaNode;
}

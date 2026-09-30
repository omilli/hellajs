import { signal } from "@hellajs/core";
import type { HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

const base = "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none hover:bg-muted hover:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4";

const variants = {
  default: "bg-transparent",
  outline:
    "border border-input bg-transparent shadow-xs hover:bg-accent hover:text-accent-foreground",
};

const sizes = {
  default: "h-9 min-w-9 px-2",
  sm: "h-8 min-w-8 px-1.5",
  lg: "h-10 min-w-10 px-2.5",
};

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

export default function Toggle(props: ToggleProps): JSX.Element {
  const pressedAccessor = typeof props.pressed === "function" ? props.pressed : undefined;
  const internal = signal(typeof props.pressed === "boolean" ? props.pressed : false);
  const pressed = (): boolean => (pressedAccessor ? pressedAccessor() : internal());

  const toggle = (): void => {
    if (props.disabled) return;
    const next = !pressed();
    if (!pressedAccessor) internal(next);
    props.onPressedChange?.(next);
  };

  return (
    <button
      type="button"
      data-slot="toggle"
      aria-pressed={pressed() ? "true" : "false"}
      data-state={pressed() ? "on" : "off"}
      disabled={props.disabled ? true : undefined}
      class={
        cn(toggleVariants({ variant: props.variant, size: props.size }), props.class)
      }
      on:click={() => toggle()}
    >
      {props.children}
    </button>
  );
}

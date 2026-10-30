import { toggle } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface ToggleProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  /** Pressed state. A boolean seeds the internal signal; an accessor makes the toggle controlled — clicks then only report through `onPressedChange`. */
  pressed?: boolean | (() => boolean);
  onPressedChange?: (pressed: boolean) => void;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}
import { cn } from "./cn.js";

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

/** Resolves the toggle's full class from the spliced variant maps — the compose arrays' shared builder. */
export function toggleVariants(options?: {
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
  class?: string;
}): string {
  return [
    "inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[color,box-shadow] outline-none hover:bg-muted hover:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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
        cn(toggleVariants({ variant, size }), cls)
      }
      {...attrs}
    >
      {children}
    </Root>
  );
}

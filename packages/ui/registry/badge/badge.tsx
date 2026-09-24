import type { HellaChildren } from "@hellajs/dom";

// @hella:styles
// @hella:end

interface BadgeProps {
  children?: HellaChildren;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  ariaInvalid?: boolean;
  class?: string;
}

export default function Badge(props: BadgeProps): JSX.Element {
  return (
    <span
      data-slot="badge"
      data-variant={props.variant ?? "default"}
      aria-invalid={props.ariaInvalid ? "true" : undefined}
      class={
        // @hella:compose
        [
          base,
          variants[props.variant ?? "default"],
          props.class,
        ]
        // @hella:end
      }
    >
      {props.children}
    </span>
  );
}

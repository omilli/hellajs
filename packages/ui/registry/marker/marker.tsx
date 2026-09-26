import type { HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const content: string;
declare const icon: string;
declare const variants: Record<string, string>;
// @hella:end

interface MarkerProps {
  children?: HellaChildren;
  variant?: "default" | "separator" | "border";
  class?: string;
}

export default function Marker(props: MarkerProps): JSX.Element {
  return (
    <div
      data-slot="marker"
      data-variant={props.variant ?? "default"}
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
    </div>
  );
}

interface MarkerIconProps {
  children?: HellaChildren;
  class?: string;
}

export function MarkerIcon(props: MarkerIconProps): JSX.Element {
  return (
    <span
      data-slot="marker-icon"
      aria-hidden="true"
      class={
        // @hella:compose
        [icon, props.class]
        // @hella:end
      }
    >
      {props.children}
    </span>
  );
}

interface MarkerContentProps {
  children?: HellaChildren;
  class?: string;
}

export function MarkerContent(props: MarkerContentProps): JSX.Element {
  return (
    <span
      data-slot="marker-content"
      class={
        // @hella:compose
        [content, props.class]
        // @hella:end
      }
    >
      {props.children}
    </span>
  );
}

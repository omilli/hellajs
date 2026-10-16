import type { MarkerProps, MarkerIconProps, MarkerContentProps } from "./marker-types.js";

// @hella:styles
declare const base: string;
declare const content: string;
declare const icon: string;
declare const variants: Record<string, string>;
// @hella:end

export function Marker({ variant, children, class: cls, ...attrs }: MarkerProps): JSX.Element {
  return (
    <div
      data-slot="marker"
      data-variant={variant ?? "default"}
      class={
        // @hella:compose
        [base, variants[variant ?? "default"], cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

export function MarkerIcon({ children, class: cls, ...attrs }: MarkerIconProps): JSX.Element {
  return (
    <span
      data-slot="marker-icon"
      aria-hidden="true"
      class={
        // @hella:compose
        [icon, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </span>
  );
}

export function MarkerContent({ children, class: cls, ...attrs }: MarkerContentProps): JSX.Element {
  return (
    <span
      data-slot="marker-content"
      class={
        // @hella:compose
        [content, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </span>
  );
}

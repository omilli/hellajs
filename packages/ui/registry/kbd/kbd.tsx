import type { KbdProps } from "./kbd-types.js";

// @hella:styles
declare const base: string;
declare const group: string;
// @hella:end

export function Kbd({ children, class: cls, ...attrs }: KbdProps): JSX.Element {
  return (
    <kbd
      data-slot="kbd"
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </kbd>
  );
}

export function KbdGroup({ children, class: cls, ...attrs }: KbdProps): JSX.Element {
  return (
    <kbd
      data-slot="kbd-group"
      class={
        // @hella:compose
        [group, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </kbd>
  );
}

import type { HellaChildren } from "@hellajs/dom";

// @hella:styles
// @hella:end

interface KbdProps {
  children?: HellaChildren;
  class?: string;
}

export default function Kbd(props: KbdProps): JSX.Element {
  return (
    <kbd
      data-slot="kbd"
      class={
        // @hella:compose
        [base, props.class]
        // @hella:end
      }
    >
      {props.children}
    </kbd>
  );
}

export function KbdGroup(props: KbdProps): JSX.Element {
  return (
    <kbd
      data-slot="kbd-group"
      class={
        // @hella:compose
        [group, props.class]
        // @hella:end
      }
    >
      {props.children}
    </kbd>
  );
}

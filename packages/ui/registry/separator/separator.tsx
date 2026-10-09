import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const base: string;
// @hella:end

interface SeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  orientation?: "horizontal" | "vertical";
}

export default function Separator({ orientation, children, class: cls, ...attrs }: SeparatorProps): JSX.Element {
  return (
    <div
      data-slot="separator"
      role="separator"
      data-orientation={orientation ?? "horizontal"}
      aria-orientation={orientation ?? "horizontal"}
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

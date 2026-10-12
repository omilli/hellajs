import type { SeparatorProps } from "./separator-types.js";

// @hella:styles
declare const base: string;
// @hella:end

export function Separator({ orientation, children, class: cls, ...attrs }: SeparatorProps): JSX.Element {
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

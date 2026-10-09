import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

import { style } from "@hellajs/css";

const base = style("direction-provider", {
  display: "contents",
});

interface DirectionProviderProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  dir?: "ltr" | "rtl";
}

/**
 * Renders a layout-neutral wrapper carrying the dir attribute. Upstream is a
 * context-only provider with no DOM node; hella has no context primitive, and
 * the dom behaviors read `getComputedStyle(anchor).direction`, so the
 * attribute IS the mechanism. display: contents keeps the wrapper out of
 * layout so compositions render as if the node were not there.
 */
export default function DirectionProvider({ dir, children, class: cls, ...attrs }: DirectionProviderProps): JSX.Element {
  return (
    <div
      data-slot="direction-provider"
      dir={dir}
      class={
        [base, cls]
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

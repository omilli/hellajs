import type { HellaChildren } from "@hellajs/dom";

// @hella:styles
// @hella:end

interface DirectionProviderProps {
  children?: HellaChildren;
  dir?: "ltr" | "rtl";
  class?: string;
}

/**
 * Renders a layout-neutral wrapper carrying the dir attribute. Upstream is a
 * context-only provider with no DOM node; hella has no context primitive, and
 * the dom behaviors read `getComputedStyle(anchor).direction`, so the
 * attribute IS the mechanism. display: contents keeps the wrapper out of
 * layout so compositions render as if the node were not there.
 */
export default function DirectionProvider(props: DirectionProviderProps): JSX.Element {
  return (
    <div
      data-slot="direction-provider"
      dir={props.dir}
      class={
        // @hella:compose
        [base, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

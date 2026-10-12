import { html } from "@hellajs/dom";
import type { HellaNode } from "@hellajs/dom";
import type { DirectionProviderProps } from "./direction-types.js";

// @hella:styles
declare const base: string;
// @hella:end

/**
 * Renders a layout-neutral wrapper carrying the dir attribute. Upstream is a
 * context-only provider with no DOM node; hella has no context primitive, and
 * the dom behaviors read `getComputedStyle(anchor).direction`, so the
 * attribute IS the mechanism. display: contents keeps the wrapper out of
 * layout so compositions render as if the node were not there.
 */
export function DirectionProvider({ dir, children, class: cls, ...attrs }: DirectionProviderProps): HellaNode {
  return html`
    <div
      data-slot="direction-provider"
      dir="${dir}"
      class="${
        // @hella:compose
        [base, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

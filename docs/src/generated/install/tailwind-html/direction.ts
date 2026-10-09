import { html } from "@hellajs/dom";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

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
export default function DirectionProvider({ dir, children, class: cls, ...attrs }: DirectionProviderProps): HellaNode {
  return html`
    <div
      data-slot="direction-provider"
      dir="${dir}"
      class="${
        cn("contents", cls)
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

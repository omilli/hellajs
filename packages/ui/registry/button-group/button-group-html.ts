import { html } from "@hellajs/dom";
import type { HellaNode } from "@hellajs/dom";
import type { ButtonGroupProps, ButtonGroupTextProps, ButtonGroupSeparatorProps } from "./button-group-types.js";

// @hella:styles
declare const base: string;
declare const orientation: Record<string, string>;
declare const separator: string;
declare const separatorBase: string;
declare const text: string;
// @hella:end

export function ButtonGroup({ orientation: orient, children, class: cls, ...attrs }: ButtonGroupProps): HellaNode {
  return html`
    <div
      role="group"
      data-slot="button-group"
      data-orientation="${orient ?? "horizontal"}"
      class="${
        // @hella:compose
        [
          base,
          orientation[orient ?? "horizontal"],
          cls,
        ]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function ButtonGroupText({ children, class: cls, ...attrs }: ButtonGroupTextProps): HellaNode {
  return html`
    <div
      data-slot="button-group-text"
      class="${
        // @hella:compose
        [text, cls]
        // @hella:end
      }"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function ButtonGroupSeparator({ orientation: orient, class: cls, ...attrs }: ButtonGroupSeparatorProps): HellaNode {
  return html`
    <div
      role="separator"
      data-slot="button-group-separator"
      data-orientation="${orient ?? "vertical"}"
      aria-orientation="${orient ?? "vertical"}"
      class="${
        // @hella:compose
        [
          separatorBase,
          separator,
          cls,
        ]
        // @hella:end
      }"
      ...${attrs}
    ></div>
  ` as HellaNode;
}

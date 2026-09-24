import { html } from "@hellajs/dom";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
// @hella:end

interface ButtonGroupProps {
  children?: HellaChildren;
  orientation?: "horizontal" | "vertical";
  class?: string;
}

export default function ButtonGroup(props: ButtonGroupProps): HellaNode {
  return html`
    <div
      role="group"
      data-slot="button-group"
      data-orientation="${props.orientation ?? "horizontal"}"
      class="${
        // @hella:compose
        [
          base,
          orientation[props.orientation ?? "horizontal"],
          props.class,
        ]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ButtonGroupTextProps {
  children?: HellaChildren;
  class?: string;
}

export function ButtonGroupText(props: ButtonGroupTextProps): HellaNode {
  return html`
    <div
      data-slot="button-group-text"
      class="${
        // @hella:compose
        [text, props.class]
        // @hella:end
      }"
    >${() => props.children}</div>
  ` as HellaNode;
}

interface ButtonGroupSeparatorProps {
  orientation?: "horizontal" | "vertical";
  class?: string;
}

export function ButtonGroupSeparator(props: ButtonGroupSeparatorProps): HellaNode {
  return html`
    <div
      role="separator"
      data-slot="button-group-separator"
      data-orientation="${props.orientation ?? "vertical"}"
      aria-orientation="${props.orientation ?? "vertical"}"
      class="${
        // @hella:compose
        [
          separatorBase,
          separator,
          props.class,
        ]
        // @hella:end
      }"
    ></div>
  ` as HellaNode;
}

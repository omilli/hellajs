import type { HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const orientation: Record<string, string>;
declare const separator: string;
declare const separatorBase: string;
declare const text: string;
// @hella:end

interface ButtonGroupProps {
  children?: HellaChildren;
  orientation?: "horizontal" | "vertical";
  class?: string;
}

export default function ButtonGroup(props: ButtonGroupProps): JSX.Element {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={props.orientation ?? "horizontal"}
      class={
        // @hella:compose
        [
          base,
          orientation[props.orientation ?? "horizontal"],
          props.class,
        ]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

interface ButtonGroupTextProps {
  children?: HellaChildren;
  class?: string;
}

export function ButtonGroupText(props: ButtonGroupTextProps): JSX.Element {
  return (
    <div
      data-slot="button-group-text"
      class={
        // @hella:compose
        [text, props.class]
        // @hella:end
      }
    >
      {props.children}
    </div>
  );
}

interface ButtonGroupSeparatorProps {
  orientation?: "horizontal" | "vertical";
  class?: string;
}

export function ButtonGroupSeparator(props: ButtonGroupSeparatorProps): JSX.Element {
  return (
    <div
      role="separator"
      data-slot="button-group-separator"
      data-orientation={props.orientation ?? "vertical"}
      aria-orientation={props.orientation ?? "vertical"}
      class={
        // @hella:compose
        [
          separatorBase,
          separator,
          props.class,
        ]
        // @hella:end
      }
    />
  );
}

import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const orientation: Record<string, string>;
declare const separator: string;
declare const separatorBase: string;
declare const text: string;
// @hella:end

interface ButtonGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  orientation?: "horizontal" | "vertical";
}

export default function ButtonGroup({ orientation: orient, children, class: cls, ...attrs }: ButtonGroupProps): JSX.Element {
  return (
    <div
      role="group"
      data-slot="button-group"
      data-orientation={orient ?? "horizontal"}
      class={
        // @hella:compose
        [
          base,
          orientation[orient ?? "horizontal"],
          cls,
        ]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface ButtonGroupTextProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export function ButtonGroupText({ children, class: cls, ...attrs }: ButtonGroupTextProps): JSX.Element {
  return (
    <div
      data-slot="button-group-text"
      class={
        // @hella:compose
        [text, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

interface ButtonGroupSeparatorProps extends HTMLAttributes<"div"> {
  orientation?: "horizontal" | "vertical";
  class?: string;
}

export function ButtonGroupSeparator({ orientation: orient, class: cls, ...attrs }: ButtonGroupSeparatorProps): JSX.Element {
  return (
    <div
      role="separator"
      data-slot="button-group-separator"
      data-orientation={orient ?? "vertical"}
      aria-orientation={orient ?? "vertical"}
      class={
        // @hella:compose
        [
          separatorBase,
          separator,
          cls,
        ]
        // @hella:end
      }
      {...attrs}
    />
  );
}

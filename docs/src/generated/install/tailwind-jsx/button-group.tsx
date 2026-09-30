import type { HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

const orientation = {
  horizontal: "[&>*:not(:first-child)]:rounded-l-none [&>*:not(:first-child)]:border-l-0 [&>*:not(:last-child)]:rounded-r-none",
  vertical: "flex-col [&>*:not(:first-child)]:rounded-t-none [&>*:not(:first-child)]:border-t-0 [&>*:not(:last-child)]:rounded-b-none",
};

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
        cn(
          "flex w-fit items-stretch has-[>[data-slot=button-group]]:gap-2 [&>*]:focus-visible:relative [&>*]:focus-visible:z-10 has-[select[aria-hidden=true]:last-child]:[&>[data-slot=select-trigger]:last-of-type]:rounded-r-md [&>[data-slot=select-trigger]:not([class*='w-'])]:w-fit [&>input]:flex-1",
          orientation[props.orientation ?? "horizontal"],
          props.class,
        )
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
        cn("flex items-center gap-2 rounded-md border bg-muted px-4 text-sm font-medium shadow-xs [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4", props.class)
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
        cn(
          "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px",
          "relative m-0! self-stretch bg-input data-[orientation=vertical]:h-auto",
          props.class,
        )
      }
    />
  );
}

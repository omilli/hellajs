import type { HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

interface SeparatorProps {
  children?: HellaChildren;
  orientation?: "horizontal" | "vertical";
  class?: string;
}

export default function Separator(props: SeparatorProps): JSX.Element {
  return (
    <div
      data-slot="separator"
      role="separator"
      data-orientation={props.orientation ?? "horizontal"}
      aria-orientation={props.orientation ?? "horizontal"}
      class={
        cn("shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-px", props.class)
      }
    >
      {props.children}
    </div>
  );
}

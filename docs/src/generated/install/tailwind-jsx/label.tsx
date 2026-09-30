import type { HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

interface LabelProps {
  children?: HellaChildren;
  for?: string;
  class?: string;
}

export default function Label(props: LabelProps): JSX.Element {
  return (
    <label
      data-slot="label"
      for={props.for}
      class={
        cn("flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50", props.class)
      }
    >
      {props.children}
    </label>
  );
}

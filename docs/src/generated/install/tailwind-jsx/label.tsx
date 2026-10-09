import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

interface LabelProps extends HTMLAttributes<"label"> {
  class?: string;
  children?: HellaChildren;
}

export default function Label({ children, class: cls, ...attrs }: LabelProps): JSX.Element {
  return (
    <label
      data-slot="label"
      class={
        cn("flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50", cls)
      }
      {...attrs}
    >
      {children}
    </label>
  );
}

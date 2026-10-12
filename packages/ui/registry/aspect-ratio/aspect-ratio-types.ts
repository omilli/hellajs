import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface AspectRatioProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  ratio?: number;
}

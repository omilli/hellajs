import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface SkeletonProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

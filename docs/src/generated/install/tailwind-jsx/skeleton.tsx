import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface SkeletonProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}
import { cn } from "./cn.js";

export function Skeleton({ children, class: cls, ...attrs }: SkeletonProps): JSX.Element {
  return (
    <div
      data-slot="skeleton"
      class={
        cn("animate-pulse rounded-md bg-accent", cls)
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

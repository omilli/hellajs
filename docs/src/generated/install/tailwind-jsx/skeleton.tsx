import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

interface SkeletonProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export default function Skeleton({ children, class: cls, ...attrs }: SkeletonProps): JSX.Element {
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

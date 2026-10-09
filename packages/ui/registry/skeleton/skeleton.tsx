import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

// @hella:styles
declare const base: string;
// @hella:end

interface SkeletonProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}

export default function Skeleton({ children, class: cls, ...attrs }: SkeletonProps): JSX.Element {
  return (
    <div
      data-slot="skeleton"
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </div>
  );
}

import type { SkeletonProps } from "./skeleton-types.js";

// @hella:styles
declare const base: string;
// @hella:end

export function Skeleton({ children, class: cls, ...attrs }: SkeletonProps): JSX.Element {
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

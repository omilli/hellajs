import { Skeleton as SkeletonCssJsx } from "../../../dist/registry/skeleton/css/skeleton";
import { Skeleton as SkeletonTailwindJsx } from "../../../dist/registry/skeleton/tailwind/skeleton";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { ChildrenVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Skeleton variant (mirrors the emitted SkeletonProps). */
export interface SkeletonVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}
/**
 * Every compiled Skeleton variant from dist/registry.
 */
export const skeletonVariants: ChildrenVariant<SkeletonVariantProps>[] = [
  { style: "css", render: SkeletonCssJsx, child: (value) => [value] },
  { style: "tailwind", render: SkeletonTailwindJsx, child: (value) => [value] },
];

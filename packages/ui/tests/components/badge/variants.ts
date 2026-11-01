import { Badge as BadgeCssJsx } from "../../../dist/registry/badge/css/badge";
import { Badge as BadgeTailwindJsx } from "../../../dist/registry/badge/tailwind/badge";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { ChildrenVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Badge variant (mirrors the emitted BadgeProps). */
export interface BadgeVariantProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
}
/**
 * Every compiled Badge variant (the Badge export) from dist/registry.
 */
export const badgeVariants: ChildrenVariant<BadgeVariantProps>[] = [
  { style: "css", render: BadgeCssJsx, child: (value) => [value] },
  { style: "tailwind", render: BadgeTailwindJsx, child: (value) => [value] },
];

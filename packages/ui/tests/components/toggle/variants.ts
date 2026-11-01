import { Toggle as ToggleCssJsx } from "../../../dist/registry/toggle/css/toggle";
import { Toggle as ToggleTailwindJsx } from "../../../dist/registry/toggle/tailwind/toggle";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { ChildrenVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Toggle variant (mirrors the emitted ToggleProps). */
export interface ToggleVariantProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  pressed?: boolean | (() => boolean);
  onPressedChange?: (pressed: boolean) => void;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}
/**
 * Every compiled Toggle variant from dist/registry: {css,tailwind}.
 */
export const toggleVariants: ChildrenVariant<ToggleVariantProps>[] = [
  { style: "css", render: ToggleCssJsx, child: (value) => [value] },
  { style: "tailwind", render: ToggleTailwindJsx, child: (value) => [value] },
];

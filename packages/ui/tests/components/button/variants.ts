import { Button as ButtonCssJsx } from "../../../dist/registry/button/css/button";
import { Button as ButtonTailwindJsx } from "../../../dist/registry/button/tailwind/button";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { ChildrenVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Button variant (mirrors the emitted ButtonProps). */
export interface ButtonVariantProps extends HTMLAttributes<"button"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
  size?: "default" | "xs" | "sm" | "lg" | "icon" | "icon-xs" | "icon-sm" | "icon-lg";
}
/** One compiled Button flavor. */
export type ButtonVariant = ChildrenVariant<ButtonVariantProps>;
/**
 * Every compiled Button variant from dist/registry: {css,tailwind}.
 */
export const buttonVariants: ButtonVariant[] = [
  { style: "css", render: ButtonCssJsx, child: (value) => [value] },
  { style: "tailwind", render: ButtonTailwindJsx, child: (value) => [value] },
];

import { Checkbox as CheckboxCssJsx } from "../../../dist/registry/checkbox/css/checkbox";
import { Checkbox as CheckboxTailwindJsx } from "../../../dist/registry/checkbox/tailwind/checkbox";
import type { HTMLAttributes } from "@hellajs/dom";
import type { ComponentVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Checkbox variant (mirrors the emitted CheckboxProps). */
export interface CheckboxVariantProps extends HTMLAttributes<"button"> {
  class?: string;
  checked?: boolean | (() => boolean);
  indeterminate?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
}
/**
 * Every compiled Checkbox variant from dist/registry: {css,tailwind}.
 */
export const checkboxVariants: ComponentVariant<CheckboxVariantProps>[] = [
  { style: "css", render: CheckboxCssJsx },
  { style: "tailwind", render: CheckboxTailwindJsx },
];

import { RadioGroup as RadioGroupCssDefault } from "../../../dist/registry/radio-group/css/radio-group";
import { RadioGroup as RadioGroupTailwindDefault } from "../../../dist/registry/radio-group/tailwind/radio-group";
import type { HTMLAttributes } from "@hellajs/dom";
import type { ComponentVariant } from "../../helpers/variants-core";

/** Item shape of every compiled RadioGroup variant (mirrors the emitted RadioGroupEntry). */
export interface RadioGroupEntryVariant {
  value: string;
  label: string;
  disabled?: boolean;
}
/** Prop bag shared by every compiled RadioGroup variant (mirrors the emitted RadioGroupProps). */
export interface RadioGroupVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  items: RadioGroupEntryVariant[] | (() => RadioGroupEntryVariant[]);
  keyBy?: "value";
  value?: () => string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
}
/**
 * Every compiled RadioGroup variant (the RadioGroup export) from dist/registry.
 * RadioGroup takes an items array, so the suites carry no `child` wrapper.
 */
export const radioGroupVariants: ComponentVariant<RadioGroupVariantProps>[] = [
  { style: "css", render: RadioGroupCssDefault },
  { style: "tailwind", render: RadioGroupTailwindDefault },
];

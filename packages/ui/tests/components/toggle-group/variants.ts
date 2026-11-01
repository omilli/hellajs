import { ToggleGroup as ToggleGroupCssDefault } from "../../../dist/registry/toggle-group/css/toggle-group";
import { ToggleGroup as ToggleGroupTailwindDefault } from "../../../dist/registry/toggle-group/tailwind/toggle-group";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { ComponentVariant } from "../../helpers/variants-core";

/** Item shape of every compiled ToggleGroup variant (mirrors the emitted ToggleGroupEntry). */
export interface ToggleGroupEntryVariant {
  value: string;
  label?: HellaChildren;
  pressed?: boolean;
  disabled?: boolean;
}
/** Prop bag shared by every compiled ToggleGroup variant (mirrors the emitted ToggleGroupProps). */
export interface ToggleGroupVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  items: ToggleGroupEntryVariant[] | (() => ToggleGroupEntryVariant[]);
  keyBy?: "value";
  type: "single" | "multiple";
  value?: () => string;
  values?: () => string[];
  onValueChange?: (value: string | string[]) => void;
  variant?: "default" | "outline";
  size?: "default" | "sm" | "lg";
}
/**
 * Every compiled ToggleGroup variant (the ToggleGroup export) from dist/registry.
 * ToggleGroup takes an items array, so the suites carry no `child` wrapper.
 */
export const toggleGroupVariants: ComponentVariant<ToggleGroupVariantProps>[] = [
  { style: "css", render: ToggleGroupCssDefault },
  { style: "tailwind", render: ToggleGroupTailwindDefault },
];

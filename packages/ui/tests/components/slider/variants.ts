import { Slider as SliderCssDefault } from "../../../dist/registry/slider/css/slider";
import { Slider as SliderTailwindDefault } from "../../../dist/registry/slider/tailwind/slider";
import type { HTMLAttributes } from "@hellajs/dom";
import type { ComponentVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Slider variant (mirrors the emitted SliderProps). */
export interface SliderVariantProps extends HTMLAttributes<"span"> {
  class?: string;
  value?: number[] | (() => number[]);
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  orientation?: "horizontal" | "vertical";
  minStepsBetweenThumbs?: number;
}
/**
 * Every compiled Slider variant from dist/registry: {css,tailwind}.
 */
export const sliderVariants: ComponentVariant<SliderVariantProps>[] = [
  { style: "css", render: SliderCssDefault },
  { style: "tailwind", render: SliderTailwindDefault },
];

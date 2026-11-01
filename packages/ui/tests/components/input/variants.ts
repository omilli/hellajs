import { Input as InputCssJsx } from "../../../dist/registry/input/css/input";
import { Input as InputTailwindJsx } from "../../../dist/registry/input/tailwind/input";
import type { HTMLAttributes } from "@hellajs/dom";
import type { ComponentVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Input variant (mirrors the emitted InputProps). */
export interface InputVariantProps extends HTMLAttributes<"input"> {
  class?: string;
}
/** One compiled Input flavor. */
export type InputVariant = ComponentVariant<InputVariantProps>;
/**
 * Every compiled Input variant from dist/registry: {css,tailwind}.
 * Input renders no children, so the suites carry no `child` wrapper.
 */
export const inputVariants: InputVariant[] = [
  { style: "css", render: InputCssJsx },
  { style: "tailwind", render: InputTailwindJsx },
];

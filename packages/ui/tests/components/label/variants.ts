import { Label as LabelCssJsx } from "../../../dist/registry/label/css/label";
import { Label as LabelTailwindJsx } from "../../../dist/registry/label/tailwind/label";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { ChildrenVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Label variant (mirrors the emitted LabelProps). */
export interface LabelVariantProps extends HTMLAttributes<"label"> {
  class?: string;
  children?: HellaChildren;
}
/**
 * Every compiled Label variant from dist/registry.
 */
export const labelVariants: ChildrenVariant<LabelVariantProps>[] = [
  { style: "css", render: LabelCssJsx, child: (value) => [value] },
  { style: "tailwind", render: LabelTailwindJsx, child: (value) => [value] },
];

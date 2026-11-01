import { Separator as SeparatorCssJsx } from "../../../dist/registry/separator/css/separator";
import { Separator as SeparatorTailwindJsx } from "../../../dist/registry/separator/tailwind/separator";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { ChildrenVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Separator variant (mirrors the emitted SeparatorProps). */
export interface SeparatorVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  orientation?: "horizontal" | "vertical";
}
/**
 * Every compiled Separator variant from dist/registry. Separator carries an
 * optional children passthrough, so the suites wrap children like Badge.
 */
export const separatorVariants: ChildrenVariant<SeparatorVariantProps>[] = [
  { style: "css", render: SeparatorCssJsx, child: (value) => [value] },
  { style: "tailwind", render: SeparatorTailwindJsx, child: (value) => [value] },
];

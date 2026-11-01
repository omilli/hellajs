import { AspectRatio as AspectRatioCssJsx } from "../../../dist/registry/aspect-ratio/css/aspect-ratio";
import { AspectRatio as AspectRatioTailwindJsx } from "../../../dist/registry/aspect-ratio/tailwind/aspect-ratio";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { ChildrenVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled AspectRatio variant (mirrors the emitted AspectRatioProps). */
export interface AspectRatioVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  ratio?: number;
}
/**
 * Every compiled AspectRatio variant from dist/registry.
 */
export const aspectRatioVariants: ChildrenVariant<AspectRatioVariantProps>[] = [
  { style: "css", render: AspectRatioCssJsx, child: (value) => [value] },
  { style: "tailwind", render: AspectRatioTailwindJsx, child: (value) => [value] },
];

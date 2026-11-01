import { DirectionProvider as DirectionCssDefault } from "../../../dist/registry/direction/css/direction";
import { DirectionProvider as DirectionTailwindDefault } from "../../../dist/registry/direction/tailwind/direction";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { ChildrenVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled DirectionProvider variant (mirrors the emitted DirectionProviderProps). */
export interface DirectionVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  dir?: "ltr" | "rtl";
}
/**
 * Every compiled DirectionProvider variant (the DirectionProvider export) from dist/registry.
 */
export const directionVariants: ChildrenVariant<DirectionVariantProps>[] = [
  { style: "css", render: DirectionCssDefault, child: (value) => [value] },
  { style: "tailwind", render: DirectionTailwindDefault, child: (value) => [value] },
];

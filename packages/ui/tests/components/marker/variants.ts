import { Marker as MarkerCssDefault } from "../../../dist/registry/marker/css/marker";
import { Marker as MarkerTailwindDefault } from "../../../dist/registry/marker/tailwind/marker";
import * as MarkerCssJsx from "../../../dist/registry/marker/css/marker";
import * as MarkerTailwindJsx from "../../../dist/registry/marker/tailwind/marker";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type { AnyModule, ChildrenVariant, PartVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Marker variant (mirrors the emitted MarkerProps). */
export interface MarkerVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "separator" | "border";
}
/** Prop bag for the compiled MarkerIcon/MarkerContent parts (mirrors the emitted props). */
export interface MarkerPartProps extends HTMLAttributes<"span"> {
  class?: string;
  children?: HellaChildren;
}
/** The named Marker parts (the other Marker exports). */
export const MARKER_PARTS = ["Icon", "Content"] as const;
/**
 * Every compiled Marker variant (the Marker export) from dist/registry.
 */
export const markerVariants: ChildrenVariant<MarkerVariantProps>[] = [
  { style: "css", render: MarkerCssDefault, child: (value) => [value] },
  { style: "tailwind", render: MarkerTailwindDefault, child: (value) => [value] },
];
/**
 * Every compiled Marker part (MarkerIcon, MarkerContent) at both styles.
 */
export const markerPartVariants: PartVariant<MarkerPartProps>[] = MARKER_PARTS.flatMap((part) =>
  partVariants(part, "Marker", [
    [MarkerCssJsx as unknown as AnyModule, "css"],
    [MarkerTailwindJsx as unknown as AnyModule, "tailwind"],
  ]),
);

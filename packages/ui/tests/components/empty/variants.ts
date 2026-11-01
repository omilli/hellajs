import { Empty as EmptyCssDefault } from "../../../dist/registry/empty/css/empty";
import { Empty as EmptyTailwindDefault } from "../../../dist/registry/empty/tailwind/empty";
import * as EmptyCssJsx from "../../../dist/registry/empty/css/empty";
import * as EmptyTailwindJsx from "../../../dist/registry/empty/tailwind/empty";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type { AnyModule, ChildrenVariant, PartVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Empty part (mirrors the emitted EmptyPartProps). */
export interface EmptyPartProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}
/** Prop bag for the compiled EmptyMedia part (mirrors the emitted EmptyMediaProps). */
export interface EmptyMediaVariantProps extends EmptyPartProps {
  variant?: "default" | "icon";
}
/** The named Empty parts (the other Empty exports). */
export const EMPTY_PARTS = ["Header", "Media", "Title", "Description", "Content"] as const;
/**
 * Every compiled Empty variant (the Empty export) from dist/registry.
 */
export const emptyVariants: ChildrenVariant<EmptyPartProps>[] = [
  { style: "css", render: EmptyCssDefault, child: (value) => [value] },
  { style: "tailwind", render: EmptyTailwindDefault, child: (value) => [value] },
];
/**
 * Every compiled Empty part (EmptyHeader…EmptyContent) at both styles.
 */
export const emptyPartVariants: PartVariant<EmptyMediaVariantProps>[] = EMPTY_PARTS.flatMap(
  (part) =>
    partVariants(part, "Empty", [
      [EmptyCssJsx as unknown as AnyModule, "css"],
      [EmptyTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
);

import { Kbd as KbdCssDefault } from "../../../dist/registry/kbd/css/kbd";
import { Kbd as KbdTailwindDefault } from "../../../dist/registry/kbd/tailwind/kbd";
import * as KbdCssJsx from "../../../dist/registry/kbd/css/kbd";
import * as KbdTailwindJsx from "../../../dist/registry/kbd/tailwind/kbd";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type {
  AnyModule,
  CardPartProps,
  ChildrenVariant,
  PartVariant,
} from "../../helpers/variants-core";

/** Prop bag shared by every compiled Kbd variant (mirrors the emitted KbdProps). */
export interface KbdVariantProps extends HTMLAttributes<"kbd"> {
  class?: string;
  children?: HellaChildren;
}
/** The named Kbd parts (the other Kbd exports). */
export const KBD_PARTS = ["Group"] as const;
/**
 * Every compiled Kbd variant (the Kbd export) from dist/registry.
 */
export const kbdVariants: ChildrenVariant<KbdVariantProps>[] = [
  { style: "css", render: KbdCssDefault, child: (value) => [value] },
  { style: "tailwind", render: KbdTailwindDefault, child: (value) => [value] },
];
/**
 * Every compiled Kbd part (KbdGroup) at both styles.
 */
export const kbdPartVariants: PartVariant<CardPartProps>[] = KBD_PARTS.flatMap((part) =>
  partVariants(part, "Kbd", [
    [KbdCssJsx as unknown as AnyModule, "css"],
    [KbdTailwindJsx as unknown as AnyModule, "tailwind"],
  ]),
);

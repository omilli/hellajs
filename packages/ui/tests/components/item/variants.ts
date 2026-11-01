import * as ItemCssJsx from "../../../dist/registry/item/css/item";
import * as ItemTailwindJsx from "../../../dist/registry/item/tailwind/item";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type { AnyModule, PartVariant } from "../../helpers/variants-core";

/** Prop bag for the compiled ItemGroup/ItemContent/ItemTitle/ItemDescription/ItemActions/ItemHeader/ItemFooter parts (mirrors the emitted props). */
export interface ItemPartProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
}
/** Prop bag for the compiled Item root (mirrors the emitted ItemProps). */
export interface ItemVariantProps extends ItemPartProps {
  variant?: "default" | "outline" | "muted";
  size?: "default" | "sm";
  selected?: boolean | (() => boolean);
}
/** Prop bag for the compiled ItemSeparator part (mirrors the emitted props). */
export interface ItemSeparatorVariantProps {
  class?: string;
}
/** Prop bag for the compiled ItemMedia part (mirrors the emitted props). */
export interface ItemMediaVariantProps extends ItemPartProps {
  variant?: "default" | "icon" | "image";
}
/** Superset prop bag across Item parts (variant unions conflict between Item root and ItemMedia, so the root's is omitted). */
export type ItemPartVariantProps = Omit<ItemVariantProps, "variant"> &
  ItemSeparatorVariantProps &
  ItemMediaVariantProps;
/** The named Item parts (every export; Item has no default export). */
export const ITEM_PARTS = [
  "Group",
  "Separator",
  "Media",
  "Content",
  "Title",
  "Description",
  "Actions",
  "Header",
  "Footer",
] as const;
/**
 * Every compiled Item part (ItemGroup…ItemFooter) at both styles.
 */
export const itemPartVariants: PartVariant<ItemPartVariantProps>[] = ITEM_PARTS.flatMap((part) =>
  partVariants(part, "Item", [
    [ItemCssJsx as unknown as AnyModule, "css"],
    [ItemTailwindJsx as unknown as AnyModule, "tailwind"],
  ]),
);
/**
 * Every compiled Item root (the named Item export — the module has no default) at both styles.
 */
export const itemVariants: PartVariant<ItemVariantProps>[] = [
  {
    part: "Item",
    style: "css",
    render: (ItemCssJsx as unknown as AnyModule).Item as unknown as (
      props: ItemVariantProps,
    ) => JSX.Element,
  },
  {
    part: "Item",
    style: "tailwind",
    render: (ItemTailwindJsx as unknown as AnyModule).Item as unknown as (
      props: ItemVariantProps,
    ) => JSX.Element,
  },
];

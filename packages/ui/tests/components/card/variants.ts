import { Card as CardCssDefault } from "../../../dist/registry/card/css/card";
import { Card as CardTailwindDefault } from "../../../dist/registry/card/tailwind/card";
import * as CardCssJsx from "../../../dist/registry/card/css/card";
import * as CardTailwindJsx from "../../../dist/registry/card/tailwind/card";
import type { HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type {
  AnyModule,
  CardPartProps,
  ChildrenVariant,
  PartVariant,
} from "../../helpers/variants-core";

/** One compiled Card flavor (the Card export). */
export type CardVariant = ChildrenVariant<CardPartProps>;
/**
 * Every compiled Card variant (the Card export) from dist/registry.
 */
export const cardVariants: CardVariant[] = [
  { style: "css", render: CardCssDefault, child: (value) => [value] },
  { style: "tailwind", render: CardTailwindDefault, child: (value) => [value] },
];
/** The named Card parts (the other Card exports). */
export const CARD_PARTS = [
  "Header",
  "Title",
  "Description",
  "Action",
  "Content",
  "Footer",
] as const;
/**
 * Every compiled Card part (CardHeader…CardFooter) at both styles.
 */
export const cardPartVariants: PartVariant<CardPartProps & { children?: HellaChildren }>[] =
  CARD_PARTS.flatMap((part) =>
    partVariants(part, "Card", [
      [CardCssJsx as unknown as AnyModule, "css"],
      [CardTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

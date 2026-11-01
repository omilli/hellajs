import * as BubbleCssJsx from "../../../dist/registry/bubble/css/bubble";
import * as BubbleTailwindJsx from "../../../dist/registry/bubble/tailwind/bubble";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type { AnyModule, CardPartProps, PartVariant } from "../../helpers/variants-core";

/** Prop bag for the compiled Bubble part (mirrors the emitted props). */
export interface BubbleVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  variant?: "default" | "secondary" | "muted" | "tinted" | "outline" | "ghost" | "destructive";
  align?: "start" | "end";
}
/** Prop bag shared by every compiled Bubble part except Bubble itself (mirrors the emitted props). */
export type BubblePartProps = CardPartProps;
/** Prop bag for the compiled BubbleReactions part (mirrors the emitted props). */
export interface BubbleReactionsVariantProps extends BubblePartProps {
  side?: "top" | "bottom";
  align?: "start" | "end";
}
/** The named Bubble exports (the module has no default). */
export const BUBBLE_PARTS = ["Group", "Content", "Reactions"] as const;
/**
 * Every compiled Bubble variant (the named Bubble export) at both styles.
 */
export const bubbleVariants: PartVariant<BubbleVariantProps>[] = [
  {
    part: "Bubble",
    style: "css",
    render: (BubbleCssJsx as unknown as AnyModule).Bubble as unknown as (
      props: BubbleVariantProps,
    ) => JSX.Element,
  },
  {
    part: "Bubble",
    style: "tailwind",
    render: (BubbleTailwindJsx as unknown as AnyModule).Bubble as unknown as (
      props: BubbleVariantProps,
    ) => JSX.Element,
  },
];
/**
 * Every compiled Bubble part (BubbleGroup, BubbleContent, BubbleReactions) at both styles.
 */
export const bubblePartVariants: PartVariant<BubblePartProps & BubbleReactionsVariantProps>[] =
  BUBBLE_PARTS.flatMap((part) =>
    partVariants(part, "Bubble", [
      [BubbleCssJsx as unknown as AnyModule, "css"],
      [BubbleTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

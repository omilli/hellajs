import * as HoverCardCssJsx from "../../../dist/registry/hover-card/css/hover-card";
import * as HoverCardTailwindJsx from "../../../dist/registry/hover-card/tailwind/hover-card";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { AnyModule, ComponentVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled HoverCard variant (mirrors the emitted HoverCardProps). */
export interface HoverCardVariantProps extends HTMLAttributes<"span"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content: HellaChildren;
  class?: string;
}
/**
 * Every compiled HoverCard variant (the HoverCard export) from dist/registry.
 * HoverCard's content portals into document.body on open, so the suites render
 * the trigger root and resolve content through the helpers/anchored pollers.
 */
export const hoverCardVariants: ComponentVariant<HoverCardVariantProps>[] = [
  {
    style: "css",
    render: (HoverCardCssJsx as unknown as AnyModule).HoverCard as unknown as (
      props: HoverCardVariantProps,
    ) => JSX.Element,
  },
  {
    style: "tailwind",
    render: (HoverCardTailwindJsx as unknown as AnyModule).HoverCard as unknown as (
      props: HoverCardVariantProps,
    ) => JSX.Element,
  },
];

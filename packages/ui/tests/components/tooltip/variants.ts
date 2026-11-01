import { Tooltip as TooltipCssDefault } from "../../../dist/registry/tooltip/css/tooltip";
import { Tooltip as TooltipTailwindDefault } from "../../../dist/registry/tooltip/tailwind/tooltip";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type { AnchoredAlign, AnchoredSide, ComponentVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Tooltip variant (mirrors the emitted TooltipProps). */
export interface TooltipVariantProps extends HTMLAttributes<"span"> {
  content: HellaChildren;
  delayDuration?: number;
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  side?: AnchoredSide;
  align?: AnchoredAlign;
  children?: HellaChildren;
  class?: string;
}
/**
 * Every compiled Tooltip variant (the Tooltip export) from dist/registry.
 * Tooltip's content portals into document.body on open, so the suites render
 * the trigger root and resolve content through the helpers/anchored pollers.
 */
export const tooltipVariants: ComponentVariant<TooltipVariantProps>[] = [
  { style: "css", render: TooltipCssDefault },
  { style: "tailwind", render: TooltipTailwindDefault },
];

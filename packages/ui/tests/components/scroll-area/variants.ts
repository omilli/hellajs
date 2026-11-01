import { ScrollArea as ScrollAreaCssDefault } from "../../../dist/registry/scroll-area/css/scroll-area";
import { ScrollArea as ScrollAreaTailwindDefault } from "../../../dist/registry/scroll-area/tailwind/scroll-area";
import * as ScrollAreaCssJsx from "../../../dist/registry/scroll-area/css/scroll-area";
import * as ScrollAreaTailwindJsx from "../../../dist/registry/scroll-area/tailwind/scroll-area";
import type { GlobalHTMLAttributes, HTMLAttributes, HellaChildren } from "@hellajs/dom";
import type {
  ChildrenVariant,
  ComponentVariant,
  ScrollerObserve,
} from "../../helpers/variants-core";

/** Prop bag shared by every compiled ScrollArea variant (mirrors the emitted ScrollAreaProps). */
export interface ScrollAreaVariantProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  observe?: ScrollerObserve;
}
/** Prop bag shared by every compiled ScrollBar variant (mirrors the emitted ScrollBarProps). */
export interface ScrollBarVariantProps extends GlobalHTMLAttributes {
  class?: string;
  orientation?: "vertical" | "horizontal";
  observe?: ScrollerObserve;
}
/**
 * Every compiled ScrollArea variant (the ScrollArea export) from dist/registry.
 */
export const scrollAreaVariants: ChildrenVariant<ScrollAreaVariantProps>[] = [
  { style: "css", render: ScrollAreaCssDefault, child: (value) => [value] },
  { style: "tailwind", render: ScrollAreaTailwindDefault, child: (value) => [value] },
];
/**
 * Every compiled ScrollBar variant (the named part) from dist/registry.
 */
export const scrollBarVariants: ComponentVariant<ScrollBarVariantProps>[] = [
  { style: "css", render: ScrollAreaCssJsx.ScrollBar },
  { style: "tailwind", render: ScrollAreaTailwindJsx.ScrollBar },
];

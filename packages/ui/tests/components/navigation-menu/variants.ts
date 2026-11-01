import * as NavigationMenuCssJsx from "../../../dist/registry/navigation-menu/css/navigation-menu";
import * as NavigationMenuTailwindJsx from "../../../dist/registry/navigation-menu/tailwind/navigation-menu";
import type { GlobalHTMLAttributes, HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type { AnyModule, ComponentVariant, PartVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled NavigationMenu variant (mirrors the emitted NavigationMenuProps). */
export interface NavigationMenuVariantProps extends HTMLAttributes<"div"> {
  value?: () => string;
  onValueChange?: (value: string) => void;
  viewport?: boolean;
  children?: HellaChildren;
  class?: string;
}
/** Superset prop bag across NavigationMenu parts (mirrors the emitted part props). */
export interface NavigationMenuPartVariantProps extends GlobalHTMLAttributes {
  value?: string;
  active?: boolean | (() => boolean);
  onActivate?: () => void;
  viewport?: string;
  onExited?: () => void;
  anchor?: () => Element | undefined;
  id?: string;
  href?: string;
  children?: HellaChildren;
  class?: string;
}
/** The named NavigationMenu parts (the other NavigationMenu exports). */
export const NAVIGATION_MENU_PARTS = [
  "List",
  "Item",
  "Trigger",
  "Content",
  "Link",
  "Viewport",
  "Indicator",
] as const;
/**
 * Every compiled NavigationMenu variant (the NavigationMenu export) from dist/registry.
 * The composed root renders no auto-appended viewport slot: portal target is an
 * explicitly rendered NavigationMenuViewport.
 */
export const navigationMenuVariants: ComponentVariant<NavigationMenuVariantProps>[] = [
  {
    style: "css",
    render: (NavigationMenuCssJsx as unknown as AnyModule).NavigationMenu as unknown as (
      props: NavigationMenuVariantProps,
    ) => JSX.Element,
  },
  {
    style: "tailwind",
    render: (NavigationMenuTailwindJsx as unknown as AnyModule).NavigationMenu as unknown as (
      props: NavigationMenuVariantProps,
    ) => JSX.Element,
  },
];
/**
 * Every compiled NavigationMenu part (NavigationMenuList…NavigationMenuIndicator) at both styles.
 */
export const navigationMenuPartVariants: PartVariant<NavigationMenuPartVariantProps>[] =
  NAVIGATION_MENU_PARTS.flatMap((part) =>
    partVariants(part, "NavigationMenu", [
      [NavigationMenuCssJsx as unknown as AnyModule, "css"],
      [NavigationMenuTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

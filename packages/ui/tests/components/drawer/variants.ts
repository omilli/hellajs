import { Drawer as DrawerCssDefault } from "../../../dist/registry/drawer/css/drawer";
import { Drawer as DrawerTailwindDefault } from "../../../dist/registry/drawer/tailwind/drawer";
import * as DrawerCssJsx from "../../../dist/registry/drawer/css/drawer";
import * as DrawerTailwindJsx from "../../../dist/registry/drawer/tailwind/drawer";
import type { GlobalHTMLAttributes, HTMLAttributes, HellaChild, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type { AnyModule, ChildrenVariant, PartVariant } from "../../helpers/variants-core";

/** Prop bag shared by every compiled Drawer variant (mirrors the emitted DrawerProps). */
export interface DrawerVariantProps extends HTMLAttributes<"div"> {
  open: () => boolean;
  onClose: () => void;
  direction?: "top" | "right" | "bottom" | "left";
  title?: string;
  description?: string;
  closeOnEscape?: boolean;
  closeOnOutside?: boolean;
  class?: string;
  children?: HellaChild | HellaChild[];
}
/** Superset prop bag across Drawer parts (mirrors the emitted part props). */
export interface DrawerPartVariantProps extends GlobalHTMLAttributes {
  children?: HellaChildren;
  class?: string;
}
/** The named Drawer parts (the Header/Footer/Title/Description vocabulary). */
export const DRAWER_PARTS = ["Header", "Footer", "Title", "Description"] as const;
/** One compiled Drawer flavor (the Drawer export). */
export type DrawerVariant = ChildrenVariant<DrawerVariantProps>;
/** The newest drawer panel portaled into document.body. */
function newestDrawerPanel(): Element | null {
  const panels = document.querySelectorAll('[data-slot="drawer-content"]');
  return panels.length === 0 ? null : panels[panels.length - 1]!;
}
/**
 * Every compiled Drawer variant (the Drawer export) from dist/registry.
 */
export const drawerVariants: ChildrenVariant<DrawerVariantProps>[] = [
  { style: "css", render: DrawerCssDefault, child: (value) => [value], root: newestDrawerPanel },
  {
    style: "tailwind",
    render: DrawerTailwindDefault,
    child: (value) => [value],
    root: newestDrawerPanel,
  },
];
/**
 * Every compiled Drawer part (DrawerHeader…DrawerDescription) at both styles.
 */
export const drawerPartVariants: PartVariant<DrawerPartVariantProps>[] = DRAWER_PARTS.flatMap(
  (part) =>
    partVariants(part, "Drawer", [
      [DrawerCssJsx as unknown as AnyModule, "css"],
      [DrawerTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
);

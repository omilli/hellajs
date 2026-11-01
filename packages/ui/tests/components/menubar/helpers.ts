import type { HellaChildren } from "@hellajs/dom";
import { menuModulePart, renderVariant, type ComponentVariant } from "../../helpers/variants-core";
import { menubarModules, type MenubarVariantProps } from "./variants";
import { awaitPortaled } from "../../helpers/anchored";

/** Local prop bag for building content-tree items through menuModulePart (mirrors the part props). */
interface ItemProps {
  children?: HellaChildren;
  destructive?: boolean;
  inset?: boolean;
  disabled?: boolean;
  "on:click"?: () => void;
  shortcut?: string;
  class?: string;
}

interface SubProps {
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

interface MenuProps {
  value?: string;
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}

/** Builds one Item of the same flavor as the composed bar under test. */
export const Item = (variant: ComponentVariant<MenubarVariantProps>, props: ItemProps) =>
  menuModulePart<ItemProps>(menubarModules, variant, "MenubarItem")(props);

/** Builds the composed Sub of the same flavor as the composed bar under test. */
export const Sub = (variant: ComponentVariant<MenubarVariantProps>, props: SubProps) =>
  menuModulePart<SubProps>(menubarModules, variant, "MenubarSub")(props);

/** Builds the composed Menu wrapper of the same flavor as the bar under test. */
export const Menu = (variant: ComponentVariant<MenubarVariantProps>, props: MenuProps) =>
  menuModulePart<MenuProps>(menubarModules, variant, "MenubarMenu")(props);

/** Resolves any compiled Menubar part by full export name at the variant's flavor. */
export const Part = (variant: ComponentVariant<MenubarVariantProps>, name: string) =>
  menuModulePart<Record<string, unknown>>(menubarModules, variant, `Menubar${name}`);

/** Renders a bar with the given menus and returns the bar element. */
export function renderBar(
  variant: ComponentVariant<MenubarVariantProps>,
  menus: HellaChildren,
  props: Partial<MenubarVariantProps> = {},
) {
  return renderVariant(variant, { children: menus, ...props }) as HTMLElement;
}

/** The bar's triggers in DOM order. */
export function triggers(bar: Element): HTMLElement[] {
  return [...bar.querySelectorAll("[data-slot='menubar-trigger']")] as HTMLElement[];
}

/** Opens the menu at the given trigger by clicking it and resolves the portaled content. */
export async function openMenu(trigger: HTMLElement) {
  trigger.dispatchEvent(new Event("click", { bubbles: true }));
  return awaitPortaled("menubar-content");
}

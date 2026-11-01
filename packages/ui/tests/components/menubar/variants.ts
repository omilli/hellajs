import * as MenubarCssJsx from "../../../dist/registry/menubar/css/menubar";
import * as MenubarTailwindJsx from "../../../dist/registry/menubar/tailwind/menubar";
import type { GlobalHTMLAttributes, HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type {
  AnyModule,
  ComponentVariant,
  MenuModuleTable,
  MenuRadioEntryVariant,
  PartVariant,
} from "../../helpers/variants-core";

/** Prop bag shared by every compiled Menubar variant (mirrors the emitted MenubarProps). */
export interface MenubarVariantProps extends HTMLAttributes<"div"> {
  value?: () => string;
  onValueChange?: (value: string) => void;
  children?: HellaChildren;
  class?: string;
}
/** Superset prop bag across Menubar parts (mirrors the emitted part props). */
export interface MenubarPartVariantProps extends GlobalHTMLAttributes {
  value?: string;
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  inset?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  shortcut?: string;
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  onSelect?: () => void;
  items?: MenuRadioEntryVariant[] | (() => MenuRadioEntryVariant[]);
  keyBy?: "value";
  onValueChange?: (value: string) => void;
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}
/** The named Menubar parts (the other Menubar exports). */
export const MENUBAR_PARTS = [
  "Menu",
  "Group",
  "Item",
  "CheckboxItem",
  "RadioGroup",
  "RadioItem",
  "Label",
  "Separator",
  "Shortcut",
  "Sub",
] as const;
/** Compiled Menubar module table, keyed [style]. */
export const menubarModules: MenuModuleTable = {
  css: MenubarCssJsx as unknown as AnyModule,
  tailwind: MenubarTailwindJsx as unknown as AnyModule,
};
/**
 * Every compiled Menubar variant (the Menubar export) from dist/registry.
 * Menubar's content portals into document.body on open, so the suites
 * render the bar and resolve content through the helpers/anchored pollers.
 */
export const menubarVariants: ComponentVariant<MenubarVariantProps>[] = [
  {
    style: "css",
    render: (MenubarCssJsx as unknown as AnyModule).Menubar as unknown as (
      props: MenubarVariantProps,
    ) => JSX.Element,
  },
  {
    style: "tailwind",
    render: (MenubarTailwindJsx as unknown as AnyModule).Menubar as unknown as (
      props: MenubarVariantProps,
    ) => JSX.Element,
  },
];
/**
 * Every compiled Menubar part (MenubarMenu…MenubarSubContent) at both styles.
 */
export const menubarPartVariants: PartVariant<MenubarPartVariantProps>[] = MENUBAR_PARTS.flatMap(
  (part) =>
    partVariants(part, "Menubar", [
      [MenubarCssJsx as unknown as AnyModule, "css"],
      [MenubarTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
);

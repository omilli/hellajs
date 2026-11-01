import * as DropdownMenuCssJsx from "../../../dist/registry/dropdown-menu/css/dropdown-menu";
import * as DropdownMenuTailwindJsx from "../../../dist/registry/dropdown-menu/tailwind/dropdown-menu";
import type { GlobalHTMLAttributes, HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type {
  AnyModule,
  ComponentVariant,
  MenuModuleTable,
  MenuRadioEntryVariant,
  PartVariant,
} from "../../helpers/variants-core";

/** Prop bag shared by every compiled DropdownMenu variant (mirrors the emitted DropdownMenuProps). */
export interface DropdownMenuVariantProps extends HTMLAttributes<"button"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}
/** Superset prop bag across DropdownMenu parts (mirrors the emitted part props). */
export interface DropdownMenuPartVariantProps extends GlobalHTMLAttributes {
  inset?: boolean;
  destructive?: boolean;
  disabled?: boolean;
  shortcut?: string;
  checked?: boolean | (() => boolean);
  onCheckedChange?: (checked: boolean) => void;
  value?: string;
  onSelect?: () => void;
  items?: MenuRadioEntryVariant[] | (() => MenuRadioEntryVariant[]);
  keyBy?: "value";
  onValueChange?: (value: string) => void;
  children?: HellaChildren;
  class?: string;
}
/** The named DropdownMenu parts (the other DropdownMenu exports). */
export const DROPDOWN_MENU_PARTS = [
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
/** Compiled DropdownMenu module table, keyed [style]. */
export const dropdownMenuModules: MenuModuleTable = {
  css: DropdownMenuCssJsx as unknown as AnyModule,
  tailwind: DropdownMenuTailwindJsx as unknown as AnyModule,
};
/**
 * Every compiled DropdownMenu variant (the DropdownMenu export) from dist/registry.
 * DropdownMenu's content portals into document.body on open, so the suites
 * render the trigger root and resolve content through the helpers/anchored pollers.
 */
export const dropdownMenuVariants: ComponentVariant<DropdownMenuVariantProps>[] = [
  {
    style: "css",
    render: (DropdownMenuCssJsx as unknown as AnyModule).DropdownMenu as unknown as (
      props: DropdownMenuVariantProps,
    ) => JSX.Element,
  },
  {
    style: "tailwind",
    render: (DropdownMenuTailwindJsx as unknown as AnyModule).DropdownMenu as unknown as (
      props: DropdownMenuVariantProps,
    ) => JSX.Element,
  },
];
/**
 * Every compiled DropdownMenu part (DropdownMenuGroup…DropdownMenuSub) at both styles.
 */
export const dropdownMenuPartVariants: PartVariant<DropdownMenuPartVariantProps>[] =
  DROPDOWN_MENU_PARTS.flatMap((part) =>
    partVariants(part, "DropdownMenu", [
      [DropdownMenuCssJsx as unknown as AnyModule, "css"],
      [DropdownMenuTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

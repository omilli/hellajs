import * as ContextMenuCssJsx from "../../../dist/registry/context-menu/css/context-menu";
import * as ContextMenuTailwindJsx from "../../../dist/registry/context-menu/tailwind/context-menu";
import type { GlobalHTMLAttributes, HTMLAttributes, HellaChildren } from "@hellajs/dom";
import { partVariants } from "../../helpers/variants-core";
import type {
  AnyModule,
  ComponentVariant,
  MenuModuleTable,
  MenuRadioEntryVariant,
  PartVariant,
} from "../../helpers/variants-core";

/** Prop bag shared by every compiled ContextMenu variant (mirrors the emitted ContextMenuProps). */
export interface ContextMenuVariantProps extends HTMLAttributes<"span"> {
  open?: () => boolean;
  onOpenChange?: (open: boolean) => void;
  children?: HellaChildren;
  content?: HellaChildren;
  class?: string;
}
/** Superset prop bag across ContextMenu parts (mirrors the emitted part props). */
export interface ContextMenuPartVariantProps extends GlobalHTMLAttributes {
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
/** The named ContextMenu parts (the other ContextMenu exports). */
export const CONTEXT_MENU_PARTS = [
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
/** Compiled ContextMenu module table, keyed [style]. */
export const contextMenuModules: MenuModuleTable = {
  css: ContextMenuCssJsx as unknown as AnyModule,
  tailwind: ContextMenuTailwindJsx as unknown as AnyModule,
};
/**
 * Every compiled ContextMenu variant (the ContextMenu export) from dist/registry.
 * ContextMenu's content portals into document.body on open, so the suites
 * render the trigger root and resolve content through the helpers/anchored pollers.
 */
export const contextMenuVariants: ComponentVariant<ContextMenuVariantProps>[] = [
  {
    style: "css",
    render: (ContextMenuCssJsx as unknown as AnyModule).ContextMenu as unknown as (
      props: ContextMenuVariantProps,
    ) => JSX.Element,
  },
  {
    style: "tailwind",
    render: (ContextMenuTailwindJsx as unknown as AnyModule).ContextMenu as unknown as (
      props: ContextMenuVariantProps,
    ) => JSX.Element,
  },
];
/**
 * Every compiled ContextMenu part (ContextMenuGroup…ContextMenuSub) at both styles.
 */
export const contextMenuPartVariants: PartVariant<ContextMenuPartVariantProps>[] =
  CONTEXT_MENU_PARTS.flatMap((part) =>
    partVariants(part, "ContextMenu", [
      [ContextMenuCssJsx as unknown as AnyModule, "css"],
      [ContextMenuTailwindJsx as unknown as AnyModule, "tailwind"],
    ]),
  );

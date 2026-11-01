import { vi } from "vite-plus/test";
import type { HellaChildren } from "@hellajs/dom";
import {
  menuModulePart,
  renderVariant,
  type ComponentVariant,
  type MenuRadioEntryVariant,
} from "../../helpers/variants-core";
import { dropdownMenuModules, type DropdownMenuVariantProps } from "./variants";
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

/** Local prop bag for the RadioGroup under test (mirrors the emitted RadioGroupProps). */
export interface RadioGroupProps {
  items?: MenuRadioEntryVariant[] | (() => MenuRadioEntryVariant[]);
  keyBy?: "value";
  value?: () => string;
  onValueChange?: (value: string) => void;
}

/** Builds one Item of the same flavor as the composed root under test. */
export const Item = (variant: ComponentVariant<DropdownMenuVariantProps>, props: ItemProps) =>
  menuModulePart<ItemProps>(dropdownMenuModules, variant, "DropdownMenuItem")(props);

/** Builds the composed Sub of the same flavor as the composed root under test. */
export const Sub = (variant: ComponentVariant<DropdownMenuVariantProps>, props: SubProps) =>
  menuModulePart<SubProps>(dropdownMenuModules, variant, "DropdownMenuSub")(props);

/** Opens the menu by clicking the trigger and resolves the portaled content once the mount walk finished. */
export async function openMenu(
  variant: ComponentVariant<DropdownMenuVariantProps>,
  content?: HellaChildren,
) {
  const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
  const trigger = renderVariant(variant, {
    content: content ?? Item(variant, { children: "Open File" }),
    onOpenChange,
  });
  trigger.dispatchEvent(new Event("click"));
  const contentNode = await awaitPortaled("dropdown-menu-content");
  return { onOpenChange, trigger, content: contentNode };
}

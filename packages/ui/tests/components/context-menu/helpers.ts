import { vi } from "vite-plus/test";
import type { HellaChildren } from "@hellajs/dom";
import { menuModulePart, renderVariant, type ComponentVariant } from "../../helpers/variants-core";
import { contextMenuModules, type ContextMenuVariantProps } from "./variants";
import { awaitPortaled } from "../../helpers/anchored";

/** Local prop bag for building content-tree items through menuModulePart (mirrors the part props). */
interface ItemProps {
  children?: HellaChildren;
  destructive?: boolean;
  disabled?: boolean;
  "on:click"?: () => void;
  shortcut?: string;
}

/** Builds one Item of the same flavor as the composed root under test. */
export const Item = (variant: ComponentVariant<ContextMenuVariantProps>, props: ItemProps) =>
  menuModulePart<ItemProps>(contextMenuModules, variant, "ContextMenuItem")(props);

/** Right-clicks the trigger zone and resolves the portaled content once the mount walk finished. */
export async function openContextMenu(
  variant: ComponentVariant<ContextMenuVariantProps>,
  content?: HellaChildren,
  x = 40,
  y = 30,
) {
  const onOpenChange = vi.fn<(open: boolean) => void>(() => {});
  const trigger = renderVariant(variant, {
    content: content ?? Item(variant, { children: "Inspect" }),
    onOpenChange,
  });
  trigger.dispatchEvent(
    new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: x, clientY: y }),
  );
  const contentNode = await awaitPortaled("context-menu-content");
  return { onOpenChange, trigger, content: contentNode };
}

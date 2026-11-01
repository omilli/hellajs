import { menu, menuSub, MenuRows } from "@hellajs/headless";
import type {
  ContextMenuPartProps,
  ContextMenuItemProps,
  ContextMenuCheckboxItemProps,
  ContextMenuRadioGroupProps,
  ContextMenuRadioItemProps,
  ContextMenuLabelProps,
  ContextMenuShortcutProps,
  ContextMenuSubProps,
  ContextMenuProps,
} from "./context-menu-types.js";

// @hella:styles
declare const checkItem: string;
declare const content: string;
declare const item: string;
declare const label: string;
declare const radioItem: string;
declare const separator: string;
declare const shortcut: string;
declare const subContent: string;
declare const subTrigger: string;
// @hella:end

export function ContextMenuGroup({
  children,
  class: cls,
  ...attrs
}: ContextMenuPartProps): JSX.Element {
  return (
    <MenuRows.Group
      data-slot="context-menu-group"
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </MenuRows.Group>
  );
}

export function ContextMenuItem({
  destructive,
  inset,
  "on:click": userClick,
  shortcut: shortcutSlot,
  children,
  class: cls,
  ...attrs
}: ContextMenuItemProps): JSX.Element {
  return (
    <MenuRows.Item
      destructive={destructive}
      inset={inset}
      shortcut={shortcutSlot}
      on:click={userClick}
      data-slot="context-menu-item"
      class={
        // @hella:compose
        [item, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </MenuRows.Item>
  );
}

export function ContextMenuCheckboxItem({
  checked: checkedProp,
  onCheckedChange,
  children,
  class: cls,
  ...attrs
}: ContextMenuCheckboxItemProps): JSX.Element {
  return (
    <MenuRows.CheckboxItem
      checked={checkedProp}
      onCheckedChange={onCheckedChange}
      data-slot="context-menu-checkbox-item"
      class={
        // @hella:compose
        [checkItem, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </MenuRows.CheckboxItem>
  );
}

export function ContextMenuRadioGroup({
  items,
  keyBy,
  value: valueProp,
  onValueChange,
  children,
  class: cls,
  ...attrs
}: ContextMenuRadioGroupProps): JSX.Element {
  return (
    <MenuRows.RadioGroup
      items={items}
      keyBy={keyBy}
      value={valueProp}
      onValueChange={onValueChange}
      data-slot="context-menu-radio-group"
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </MenuRows.RadioGroup>
  );
}

export function ContextMenuRadioItem({
  value,
  checked: checkedProp,
  onSelect,
  children,
  class: cls,
  ...attrs
}: ContextMenuRadioItemProps): JSX.Element {
  return (
    <MenuRows.RadioItem
      value={value}
      checked={checkedProp}
      onSelect={onSelect}
      data-slot="context-menu-radio-item"
      class={
        // @hella:compose
        [radioItem, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </MenuRows.RadioItem>
  );
}

export function ContextMenuLabel({
  inset,
  children,
  class: cls,
  ...attrs
}: ContextMenuLabelProps): JSX.Element {
  return (
    <MenuRows.Label
      inset={inset}
      data-slot="context-menu-label"
      class={
        // @hella:compose
        [label, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </MenuRows.Label>
  );
}

export function ContextMenuSeparator({ class: cls, ...attrs }: ContextMenuPartProps): JSX.Element {
  return (
    <MenuRows.Separator
      data-slot="context-menu-separator"
      class={
        // @hella:compose
        [separator, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

export function ContextMenuShortcut({
  children,
  class: cls,
  ...attrs
}: ContextMenuShortcutProps): JSX.Element {
  return (
    <MenuRows.Shortcut
      data-slot="context-menu-shortcut"
      class={
        // @hella:compose
        [shortcut, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </MenuRows.Shortcut>
  );
}

export function ContextMenuSub({
  content: contentSlot,
  children,
  class: cls,
  ...attrs
}: ContextMenuSubProps): JSX.Element {
  const sub = menuSub();
  return (
    <sub.Trigger
      data-slot="context-menu-sub-trigger"
      class={
        // @hella:compose
        [subTrigger, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
      <sub.Content
        data-slot="context-menu-sub-content"
        class={
          // @hella:compose
          [subContent]
          // @hella:end
        }
      >
        {contentSlot}
      </sub.Content>
    </sub.Trigger>
  );
}

export function ContextMenu({
  open,
  onOpenChange,
  content: contentSlot,
  children,
  class: cls,
  ...attrs
}: ContextMenuProps): JSX.Element {
  const Context = menu({ trigger: "contextmenu", open, onOpenChange });
  return (
    <Context.Trigger
      data-slot="context-menu-trigger"
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
      <Context.Content
        data-slot="context-menu-content"
        class={
          // @hella:compose
          [content]
          // @hella:end
        }
      >
        {contentSlot}
      </Context.Content>
    </Context.Trigger>
  );
}

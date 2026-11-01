import { menu } from "@hellajs/headless";
import type {
  DropdownMenuPartProps,
  DropdownMenuItemProps,
  DropdownMenuCheckboxItemProps,
  DropdownMenuRadioGroupProps,
  DropdownMenuRadioItemProps,
  DropdownMenuLabelProps,
  DropdownMenuShortcutProps,
  DropdownMenuSubProps,
  DropdownMenuProps,
} from "./dropdown-menu-types.js";

// @hella:styles
declare const base: string;
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

export function DropdownMenuGroup({
  children,
  class: cls,
  ...attrs
}: DropdownMenuPartProps): JSX.Element {
  const { Group } = menu();
  return (
    <Group
      data-slot="dropdown-menu-group"
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Group>
  );
}

export function DropdownMenuItem({
  destructive,
  inset,
  "on:click": userClick,
  shortcut: shortcutSlot,
  children,
  class: cls,
  ...attrs
}: DropdownMenuItemProps): JSX.Element {
  const { Item } = menu();
  return (
    <Item
      destructive={destructive}
      inset={inset}
      shortcut={shortcutSlot}
      on:click={userClick}
      data-slot="dropdown-menu-item"
      class={
        // @hella:compose
        [item, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Item>
  );
}

export function DropdownMenuCheckboxItem({
  checked: checkedProp,
  onCheckedChange,
  children,
  class: cls,
  ...attrs
}: DropdownMenuCheckboxItemProps): JSX.Element {
  const { CheckboxItem } = menu();
  return (
    <CheckboxItem
      checked={checkedProp}
      onCheckedChange={onCheckedChange}
      data-slot="dropdown-menu-checkbox-item"
      class={
        // @hella:compose
        [checkItem, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </CheckboxItem>
  );
}

export function DropdownMenuRadioGroup({
  items,
  keyBy,
  value: valueProp,
  onValueChange,
  children,
  class: cls,
  ...attrs
}: DropdownMenuRadioGroupProps): JSX.Element {
  const { RadioGroup } = menu();
  return (
    <RadioGroup
      items={items}
      keyBy={keyBy}
      value={valueProp}
      onValueChange={onValueChange}
      data-slot="dropdown-menu-radio-group"
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </RadioGroup>
  );
}

export function DropdownMenuRadioItem({
  value,
  checked: checkedProp,
  onSelect,
  children,
  class: cls,
  ...attrs
}: DropdownMenuRadioItemProps): JSX.Element {
  const { RadioItem } = menu();
  return (
    <RadioItem
      value={value}
      checked={checkedProp}
      onSelect={onSelect}
      data-slot="dropdown-menu-radio-item"
      class={
        // @hella:compose
        [radioItem, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </RadioItem>
  );
}

export function DropdownMenuLabel({
  inset,
  children,
  class: cls,
  ...attrs
}: DropdownMenuLabelProps): JSX.Element {
  const { Label } = menu();
  return (
    <Label
      inset={inset}
      data-slot="dropdown-menu-label"
      class={
        // @hella:compose
        [label, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Label>
  );
}

export function DropdownMenuSeparator({
  class: cls,
  ...attrs
}: DropdownMenuPartProps): JSX.Element {
  const { Separator } = menu();
  return (
    <Separator
      data-slot="dropdown-menu-separator"
      class={
        // @hella:compose
        [separator, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

export function DropdownMenuShortcut({
  children,
  class: cls,
  ...attrs
}: DropdownMenuShortcutProps): JSX.Element {
  const { Shortcut } = menu();
  return (
    <Shortcut
      data-slot="dropdown-menu-shortcut"
      class={
        // @hella:compose
        [shortcut, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Shortcut>
  );
}

export function DropdownMenuSub({
  content: contentSlot,
  children,
  class: cls,
  ...attrs
}: DropdownMenuSubProps): JSX.Element {
  const sub = menu().sub();
  return (
    <sub.Trigger
      data-slot="dropdown-menu-sub-trigger"
      class={
        // @hella:compose
        [subTrigger, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
      <sub.Content
        data-slot="dropdown-menu-sub-content"
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

export function DropdownMenu({
  open,
  onOpenChange,
  content: contentSlot,
  children,
  class: cls,
  ...attrs
}: DropdownMenuProps): JSX.Element {
  const Menu = menu({ open, onOpenChange });
  return (
    <Menu.Trigger
      data-slot="dropdown-menu-trigger"
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
      <Menu.Content
        data-slot="dropdown-menu-content"
        class={
          // @hella:compose
          [content]
          // @hella:end
        }
      >
        {contentSlot}
      </Menu.Content>
    </Menu.Trigger>
  );
}

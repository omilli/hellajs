import { menu, menubar } from "@hellajs/headless";
import type {
  MenubarPartProps,
  MenubarItemProps,
  MenubarCheckboxItemProps,
  MenubarRadioGroupProps,
  MenubarRadioItemProps,
  MenubarLabelProps,
  MenubarShortcutProps,
  MenubarSubProps,
  MenubarMenuProps,
  MenubarProps,
} from "./menubar-types.js";

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
declare const trigger: string;
// @hella:end

export function MenubarGroup({ children, class: cls, ...attrs }: MenubarPartProps): JSX.Element {
  const { Group } = menu();
  return (
    <Group
      data-slot="menubar-group"
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

export function MenubarItem({
  destructive,
  inset,
  "on:click": userClick,
  shortcut: shortcutSlot,
  children,
  class: cls,
  ...attrs
}: MenubarItemProps): JSX.Element {
  const { Item } = menu();
  return (
    <Item
      destructive={destructive}
      inset={inset}
      shortcut={shortcutSlot}
      on:click={userClick}
      data-slot="menubar-item"
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

export function MenubarCheckboxItem({
  checked: checkedProp,
  onCheckedChange,
  children,
  class: cls,
  ...attrs
}: MenubarCheckboxItemProps): JSX.Element {
  const { CheckboxItem } = menu();
  return (
    <CheckboxItem
      checked={checkedProp}
      onCheckedChange={onCheckedChange}
      data-slot="menubar-checkbox-item"
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

export function MenubarRadioGroup({
  items,
  keyBy,
  value: valueProp,
  onValueChange,
  children,
  class: cls,
  ...attrs
}: MenubarRadioGroupProps): JSX.Element {
  const { RadioGroup } = menu();
  return (
    <RadioGroup
      items={items}
      keyBy={keyBy}
      value={valueProp}
      onValueChange={onValueChange}
      data-slot="menubar-radio-group"
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

export function MenubarRadioItem({
  value,
  checked: checkedProp,
  onSelect,
  children,
  class: cls,
  ...attrs
}: MenubarRadioItemProps): JSX.Element {
  const { RadioItem } = menu();
  return (
    <RadioItem
      value={value}
      checked={checkedProp}
      onSelect={onSelect}
      data-slot="menubar-radio-item"
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

export function MenubarLabel({
  inset,
  children,
  class: cls,
  ...attrs
}: MenubarLabelProps): JSX.Element {
  const { Label } = menu();
  return (
    <Label
      inset={inset}
      data-slot="menubar-label"
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

export function MenubarSeparator({ class: cls, ...attrs }: MenubarPartProps): JSX.Element {
  const { Separator } = menu();
  return (
    <Separator
      data-slot="menubar-separator"
      class={
        // @hella:compose
        [separator, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

export function MenubarShortcut({
  children,
  class: cls,
  ...attrs
}: MenubarShortcutProps): JSX.Element {
  const { Shortcut } = menu();
  return (
    <Shortcut
      data-slot="menubar-shortcut"
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

export function MenubarSub({
  content: contentSlot,
  children,
  class: cls,
  ...attrs
}: MenubarSubProps): JSX.Element {
  const sub = menu().sub();
  return (
    <sub.Trigger
      data-slot="menubar-sub-trigger"
      class={
        // @hella:compose
        [subTrigger, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
      <sub.Content
        data-slot="menubar-sub-content"
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

export function MenubarMenu({
  value,
  open,
  onOpenChange,
  content: contentSlot,
  children,
  class: cls,
  ...attrs
}: MenubarMenuProps): JSX.Element {
  const { menu } = menubar();
  const File = menu({ value, open, onOpenChange });
  return (
    <div
      data-slot="menubar-menu"
      data-value={value}
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      <File.Trigger
        data-slot="menubar-trigger"
        class={
          // @hella:compose
          [trigger]
          // @hella:end
        }
      >
        {children}
      </File.Trigger>
      <File.Content
        data-slot="menubar-content"
        class={
          // @hella:compose
          [content]
          // @hella:end
        }
      >
        {contentSlot}
      </File.Content>
    </div>
  );
}

export function Menubar({
  value: valueProp,
  onValueChange,
  children,
  class: cls,
  ...attrs
}: MenubarProps): JSX.Element {
  const { Bar } = menubar({ value: valueProp, onValueChange });
  return (
    <Bar
      data-slot="menubar"
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Bar>
  );
}

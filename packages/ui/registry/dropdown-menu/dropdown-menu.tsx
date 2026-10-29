import { menu } from "@hellajs/headless";
import type {
  DropdownMenuTriggerProps,
  DropdownMenuContentProps,
  DropdownMenuPartProps,
  DropdownMenuItemProps,
  DropdownMenuCheckboxItemProps,
  DropdownMenuRadioGroupProps,
  DropdownMenuRadioItemProps,
  DropdownMenuLabelProps,
  DropdownMenuShortcutProps,
  DropdownMenuSubTriggerProps,
  DropdownMenuSubContentProps,
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

/** The manual trigger button; the composed DropdownMenu renders the same shape wired to toggle + aria state. */
export function DropdownMenuTrigger({
  children,
  class: cls,
  ...attrs
}: DropdownMenuTriggerProps): JSX.Element {
  const { Trigger } = menu();
  return (
    <Trigger
      data-slot="dropdown-menu-trigger"
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Trigger>
  );
}

/** The manual content layer; the composed DropdownMenu portals the same wiring under its trigger's state. */
export function DropdownMenuContent({
  state,
  id,
  side: sideProp,
  align: alignProp,
  sideOffset,
  alignOffset: alignOffsetProp,
  anchor,
  onDismiss,
  onExited,
  onArrowLeft,
  children,
  class: cls,
  ...attrs
}: DropdownMenuContentProps): JSX.Element {
  const side = sideProp ?? "bottom";
  const align = alignProp ?? "start";
  const alignOffset = alignOffsetProp ?? 0;
  const { Content } = menu({
    open: () => (state?.() ?? "open") === "open",
    onOpenChange: (next) => {
      if (!next) onDismiss?.();
    },
  });
  return (
    <Content
      id={id}
      side={side}
      align={align}
      sideOffset={sideOffset}
      alignOffset={alignOffset}
      anchor={anchor}
      onArrowLeft={onArrowLeft}
      onExited={onExited}
      data-slot="dropdown-menu-content"
      class={
        // @hella:compose
        [content, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Content>
  );
}

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

export function DropdownMenuSubTrigger({
  inset,
  state,
  onOpen,
  children,
  class: cls,
  ...attrs
}: DropdownMenuSubTriggerProps): JSX.Element {
  const sub = menu().sub({
    open: state ? () => state() === "open" : undefined,
    onOpenChange: (next) => {
      if (next) onOpen?.();
    },
  });
  return (
    <sub.Trigger
      inset={inset}
      data-slot="dropdown-menu-sub-trigger"
      class={
        // @hella:compose
        [subTrigger, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </sub.Trigger>
  );
}

export function DropdownMenuSubContent({
  state,
  side: sideProp,
  align: alignProp,
  sideOffset,
  anchor,
  onDismiss,
  onExited,
  onArrowLeft,
  onPointerEnter,
  children,
  class: cls,
  ...attrs
}: DropdownMenuSubContentProps): JSX.Element {
  const side = sideProp ?? "right";
  const align = alignProp ?? "start";
  // ArrowLeft-exit and pointerenter-cancel are the factory sub wiring's own
  // behaviors now - consumed here so they never reach the DOM as attributes.
  void onArrowLeft;
  void onPointerEnter;
  const { Content } = menu().sub({
    open: () => (state?.() ?? "open") === "open",
    onOpenChange: (next) => {
      if (!next) onDismiss?.();
    },
  });
  return (
    <Content
      side={side}
      align={align}
      sideOffset={sideOffset}
      anchor={anchor}
      onExited={onExited}
      data-slot="dropdown-menu-sub-content"
      class={
        // @hella:compose
        [subContent, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Content>
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

import { menu } from "@hellajs/headless";
import type {
  ContextMenuTriggerProps,
  ContextMenuContentProps,
  ContextMenuPartProps,
  ContextMenuItemProps,
  ContextMenuCheckboxItemProps,
  ContextMenuRadioGroupProps,
  ContextMenuRadioItemProps,
  ContextMenuLabelProps,
  ContextMenuShortcutProps,
  ContextMenuSubTriggerProps,
  ContextMenuSubContentProps,
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

/** The manual trigger zone; the composed ContextMenu renders the same shape wired to the `contextmenu` listener. */
export function ContextMenuTrigger({
  children,
  class: cls,
  ...attrs
}: ContextMenuTriggerProps): JSX.Element {
  const { Trigger } = menu({ trigger: "contextmenu" });
  return (
    <Trigger
      data-slot="context-menu-trigger"
      class={
        // @hella:compose
        [cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Trigger>
  );
}

/** The manual content layer; the composed ContextMenu portals the same wiring under its zone's state. */
export function ContextMenuContent({
  state,
  id,
  side: sideProp,
  align: alignProp,
  anchor,
  onDismiss,
  onExited,
  onArrowLeft,
  children,
  class: cls,
  ...attrs
}: ContextMenuContentProps): JSX.Element {
  const side = sideProp ?? "bottom";
  const align = alignProp ?? "start";
  const { Content } = menu({
    trigger: "contextmenu",
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
      anchor={anchor}
      onArrowLeft={onArrowLeft}
      onExited={onExited}
      data-slot="context-menu-content"
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

export function ContextMenuGroup({
  children,
  class: cls,
  ...attrs
}: ContextMenuPartProps): JSX.Element {
  const { Group } = menu();
  return (
    <Group
      data-slot="context-menu-group"
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

export function ContextMenuItem({
  destructive,
  inset,
  "on:click": userClick,
  shortcut: shortcutSlot,
  children,
  class: cls,
  ...attrs
}: ContextMenuItemProps): JSX.Element {
  const { Item } = menu();
  return (
    <Item
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
    </Item>
  );
}

export function ContextMenuCheckboxItem({
  checked: checkedProp,
  onCheckedChange,
  children,
  class: cls,
  ...attrs
}: ContextMenuCheckboxItemProps): JSX.Element {
  const { CheckboxItem } = menu();
  return (
    <CheckboxItem
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
    </CheckboxItem>
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
  const { RadioGroup } = menu();
  return (
    <RadioGroup
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
    </RadioGroup>
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
  const { RadioItem } = menu();
  return (
    <RadioItem
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
    </RadioItem>
  );
}

export function ContextMenuLabel({
  inset,
  children,
  class: cls,
  ...attrs
}: ContextMenuLabelProps): JSX.Element {
  const { Label } = menu();
  return (
    <Label
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
    </Label>
  );
}

export function ContextMenuSeparator({ class: cls, ...attrs }: ContextMenuPartProps): JSX.Element {
  const { Separator } = menu();
  return (
    <Separator
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
  const { Shortcut } = menu();
  return (
    <Shortcut
      data-slot="context-menu-shortcut"
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

export function ContextMenuSubTrigger({
  inset,
  state,
  onOpen,
  children,
  class: cls,
  ...attrs
}: ContextMenuSubTriggerProps): JSX.Element {
  const sub = menu().sub({
    open: state ? () => state() === "open" : undefined,
    onOpenChange: (next) => {
      if (next) onOpen?.();
    },
  });
  return (
    <sub.Trigger
      inset={inset}
      data-slot="context-menu-sub-trigger"
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

export function ContextMenuSubContent({
  state,
  side: sideProp,
  align: alignProp,
  anchor,
  onDismiss,
  onExited,
  onArrowLeft,
  onPointerEnter,
  children,
  class: cls,
  ...attrs
}: ContextMenuSubContentProps): JSX.Element {
  const side = sideProp ?? "right";
  const align = alignProp ?? "start";
  // ArrowLeft-exit and pointerenter-cancel are the factory sub wiring's own
  // utils now - consumed here so they never reach the DOM as attributes.
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
      anchor={anchor}
      onExited={onExited}
      data-slot="context-menu-sub-content"
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

export function ContextMenuSub({
  content: contentSlot,
  children,
  class: cls,
  ...attrs
}: ContextMenuSubProps): JSX.Element {
  const sub = menu().sub();
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

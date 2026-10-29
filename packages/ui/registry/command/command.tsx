import { command } from "@hellajs/headless";
import type {
  CommandItemData,
  CommandInputProps,
  CommandListProps,
  CommandEmptyProps,
  CommandGroupProps,
  CommandSeparatorProps,
  CommandItemProps,
  CommandShortcutProps,
  CommandProps,
  CommandDialogProps,
} from "./command-types.js";

export type { CommandItemData };

// @hella:styles
declare const base: string;
declare const dialogPanel: string;
declare const empty: string;
declare const group: string;
declare const inputWrapper: string;
declare const item: string;
declare const list: string;
declare const separator: string;
declare const shortcut: string;
// @hella:end

/** The search row; the composed Command threads the query and keyboard model through the factory. */
export function CommandInput({ children, class: cls, ...attrs }: CommandInputProps): JSX.Element {
  const { Input } = command();
  return (
    <Input
      class={
        // @hella:compose
        [inputWrapper, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Input>
  );
}

/** The scrolling `role="listbox"`; the composed Command hands the factory its items and renders the ranked body. */
export function CommandList({ id, children, class: cls, ...attrs }: CommandListProps): JSX.Element {
  const { List } = command();
  return (
    <List
      id={id}
      class={
        // @hella:compose
        [list, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </List>
  );
}

export function CommandEmpty({ children, class: cls, ...attrs }: CommandEmptyProps): JSX.Element {
  const { Empty } = command();
  return (
    <Empty
      class={
        // @hella:compose
        [empty, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Empty>
  );
}

export function CommandGroup({
  heading,
  hidden,
  children,
  class: cls,
  ...attrs
}: CommandGroupProps): JSX.Element {
  const { Group } = command();
  return (
    <Group
      heading={heading}
      hidden={hidden}
      class={
        // @hella:compose
        [group, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Group>
  );
}

export function CommandSeparator({ class: cls, ...attrs }: CommandSeparatorProps): JSX.Element {
  const { Separator } = command();
  return (
    <Separator
      class={
        // @hella:compose
        [separator, cls]
        // @hella:end
      }
      {...attrs}
    />
  );
}

export function CommandItem({
  value,
  id,
  disabled,
  active,
  onSelect,
  children,
  class: cls,
  ...attrs
}: CommandItemProps): JSX.Element {
  const { Item } = command();
  return (
    <Item
      value={value}
      id={id}
      disabled={disabled}
      active={active}
      onSelect={onSelect}
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

export function CommandShortcut({
  children,
  class: cls,
  ...attrs
}: CommandShortcutProps): JSX.Element {
  const { Shortcut } = command();
  return (
    <Shortcut
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

/**
 * The palette dialog: the factory's `Dialog` part — overlay, portaled panel
 * with trap/escape/outside arming, screen-reader header, close button, and the
 * command surface — styled through descendants of the one wrapper-root class.
 * Manual parts compose inside through children.
 */
export function CommandDialog({
  open,
  onClose,
  title: titleText,
  description: descriptionText,
  children,
  class: cls,
  ...attrs
}: CommandDialogProps): JSX.Element {
  const { Dialog } = command();
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={titleText}
      description={descriptionText}
      class={
        // @hella:compose
        [dialogPanel, cls]
        // @hella:end
      }
      {...attrs}
    >
      {children}
    </Dialog>
  );
}

export function Command({
  items,
  filter,
  loop,
  value,
  onValueChange,
  children,
  class: cls,
  ...attrs
}: CommandProps): JSX.Element {
  const C = command({ items, filter, loop, value, onValueChange });
  return (
    <div
      data-slot="command"
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      <C.Input
        class={
          // @hella:compose
          [inputWrapper]
          // @hella:end
        }
      />
      <C.List
        class={
          // @hella:compose
          [list]
          // @hella:end
        }
      />
      {children}
    </div>
  );
}

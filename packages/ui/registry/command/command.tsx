import { command } from "@hellajs/headless";
import type { CommandItemData, CommandProps, CommandDialogProps } from "./command-types.js";

export type { CommandItemData };

// @hella:styles
declare const base: string;
declare const dialogPanel: string;
declare const inputWrapper: string;
declare const list: string;
// @hella:end

/**
 * The palette dialog: the factory's `Dialog` part — overlay, portaled panel
 * with trap/escape/outside arming, screen-reader header, close button, and the
 * command surface — styled through descendants of the one wrapper-root class.
 * The items schema renders the inner command surface.
 */
export function CommandDialog({
  items,
  filter,
  loop,
  value,
  onValueChange,
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
      <Command
        items={items}
        filter={filter}
        loop={loop}
        value={value}
        onValueChange={onValueChange}
      >
        {children}
      </Command>
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

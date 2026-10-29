import { command } from "@hellajs/headless";
import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

interface CommandItemData {
  value: string;
  label: string;
  group?: string;
  keywords?: string[];
  shortcut?: string;
  disabled?: boolean;
  onSelect?: () => void;
}

interface RankedItem {
  item: CommandItemData;
  score: number;
}

interface CommandInputProps extends HTMLAttributes<"input"> {
  children?: HellaChildren;
  class?: string;
}

interface CommandListProps extends HTMLAttributes<"div"> {
  /** The listbox id; option ids derive as `<id>-opt-<value>`. */
  id?: string;
  children?: HellaChildren;
  class?: string;
}

interface CommandEmptyProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

interface CommandGroupProps extends HTMLAttributes<"div"> {
  heading?: string;
  hidden?: boolean | (() => boolean);
  children?: HellaChildren;
  class?: string;
}

interface CommandSeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
}

interface CommandItemProps extends HTMLAttributes<"div"> {
  value?: string;
  /** The option's stable id; defaults to `<listId>-opt-<value>` from the owning factory. */
  id?: string;
  disabled?: boolean;
  /** Selected state (the ref's data-selected accent); an accessor follows the owning command's active item. */
  active?: () => boolean;
  /** Called on click and on Enter when the owning command commits. */
  onSelect?: () => void;
  children?: HellaChildren;
  class?: string;
}

interface CommandShortcutProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

interface CommandProps extends HTMLAttributes<"div"> {
  items?: CommandItemData[] | (() => CommandItemData[]);
  /** Replaces the default scoring filter (earlier matches, word-boundary starts, keyword hits). */
  filter?: (items: CommandItemData[], query: string) => CommandItemData[];
  /** Wraps arrow movement at the edges; the default clamps. */
  loop?: boolean;
  /** Controlled active value. When given, the root never writes its internal cursor and onValueChange reports each requested move and selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  class?: string;
  /** Extra chrome rendered below the auto-rendered list (footer hints, custom rows). */
  children?: HellaChildren;
}

interface CommandDialogProps extends HTMLAttributes<"div"> {
  open: () => boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  class?: string;
  children?: HellaChildren;
}
import { cn } from "./cn.js";

export type { CommandItemData };

/** The search row; the composed Command threads the query and keyboard model through the factory. */
export function CommandInput({ children, class: cls, ...attrs }: CommandInputProps): JSX.Element {
  const { Input } = command();
  return (
    <Input
      class={
        cn("flex h-9 items-center gap-2 border-b px-3 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:opacity-50 [&>input]:flex [&>input]:h-10 [&>input]:w-full [&>input]:rounded-md [&>input]:bg-transparent [&>input]:py-3 [&>input]:text-sm [&>input]:outline-hidden [&>input]:placeholder:text-muted-foreground [&>input]:disabled:cursor-not-allowed [&>input]:disabled:opacity-50", cls)
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
        cn("max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto [&_[data-slot=command-item]]:relative [&_[data-slot=command-item]]:flex [&_[data-slot=command-item]]:cursor-default [&_[data-slot=command-item]]:items-center [&_[data-slot=command-item]]:gap-2 [&_[data-slot=command-item]]:rounded-sm [&_[data-slot=command-item]]:py-1.5 [&_[data-slot=command-item]]:px-2 [&_[data-slot=command-item]]:text-sm [&_[data-slot=command-item]]:outline-hidden [&_[data-slot=command-item]]:select-none [&_[data-slot=command-item]]:data-[disabled=true]:pointer-events-none [&_[data-slot=command-item]]:data-[disabled=true]:opacity-50 [&_[data-slot=command-item]]:data-[selected=true]:bg-accent [&_[data-slot=command-item]]:data-[selected=true]:text-accent-foreground [&_[data-slot=command-item]_svg]:pointer-events-none [&_[data-slot=command-item]_svg]:shrink-0 [&_[data-slot=command-item]_svg:not([class*='size-'])]:size-4 [&_[data-slot=command-item]_svg:not([class*='text-'])]:text-muted-foreground [&_[data-slot=command-item]_[data-slot=command-shortcut]]:ml-auto [&_[data-slot=command-item]_[data-slot=command-shortcut]]:text-xs [&_[data-slot=command-item]_[data-slot=command-shortcut]]:tracking-widest [&_[data-slot=command-item]_[data-slot=command-shortcut]]:text-muted-foreground [&_[data-slot=command-empty]]:py-6 [&_[data-slot=command-empty]]:text-center [&_[data-slot=command-empty]]:text-sm [&_[data-slot=command-group]]:overflow-hidden [&_[data-slot=command-group]]:p-1 [&_[data-slot=command-group]]:text-foreground [&_[data-slot=command-group]_[data-slot=command-group-heading]]:px-2 [&_[data-slot=command-group]_[data-slot=command-group-heading]]:py-1.5 [&_[data-slot=command-group]_[data-slot=command-group-heading]]:text-xs [&_[data-slot=command-group]_[data-slot=command-group-heading]]:font-medium [&_[data-slot=command-group]_[data-slot=command-group-heading]]:text-muted-foreground", cls)
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
        cn("py-6 text-center text-sm", cls)
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
        cn("overflow-hidden p-1 text-foreground [&_[data-slot='command-group-heading']]:px-2 [&_[data-slot='command-group-heading']]:py-1.5 [&_[data-slot='command-group-heading']]:text-xs [&_[data-slot='command-group-heading']]:font-medium [&_[data-slot='command-group-heading']]:text-muted-foreground", cls)
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
        cn("-mx-1 h-px bg-border", cls)
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
        cn("relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50 data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 [&_svg:not([class*='text-'])]:text-muted-foreground", cls)
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
        cn("ml-auto text-xs tracking-widest text-muted-foreground", cls)
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
        cn("[&_[data-slot=dialog-overlay]]:fixed [&_[data-slot=dialog-overlay]]:inset-0 [&_[data-slot=dialog-overlay]]:z-50 [&_[data-slot=dialog-overlay]]:bg-black/50 [&_[data-slot=dialog-overlay]]:data-[state=closed]:animate-out [&_[data-slot=dialog-overlay]]:data-[state=closed]:fade-out-0 [&_[data-slot=dialog-overlay]]:data-[state=open]:animate-in [&_[data-slot=dialog-overlay]]:data-[state=open]:fade-in-0 [&_[data-slot=dialog-content]]:fixed [&_[data-slot=dialog-content]]:top-[50%] [&_[data-slot=dialog-content]]:left-[50%] [&_[data-slot=dialog-content]]:z-50 [&_[data-slot=dialog-content]]:grid [&_[data-slot=dialog-content]]:w-full [&_[data-slot=dialog-content]]:max-w-[calc(100%-2rem)] [&_[data-slot=dialog-content]]:translate-x-[-50%] [&_[data-slot=dialog-content]]:translate-y-[-50%] [&_[data-slot=dialog-content]]:gap-4 [&_[data-slot=dialog-content]]:rounded-lg [&_[data-slot=dialog-content]]:border [&_[data-slot=dialog-content]]:bg-background [&_[data-slot=dialog-content]]:p-0 [&_[data-slot=dialog-content]]:shadow-lg [&_[data-slot=dialog-content]]:duration-200 [&_[data-slot=dialog-content]]:outline-none [&_[data-slot=dialog-content]]:overflow-hidden [&_[data-slot=dialog-content]]:data-[state=closed]:animate-out [&_[data-slot=dialog-content]]:data-[state=closed]:fade-out-0 [&_[data-slot=dialog-content]]:data-[state=closed]:zoom-out-95 [&_[data-slot=dialog-content]]:data-[state=open]:animate-in [&_[data-slot=dialog-content]]:data-[state=open]:fade-in-0 [&_[data-slot=dialog-content]]:data-[state=open]:zoom-in-95 [&_[data-slot=dialog-content]]:sm:max-w-lg [&_[data-slot=dialog-content]_[data-slot=dialog-header]]:sr-only [&_[data-slot=dialog-content]_[data-slot=dialog-title]]:text-lg [&_[data-slot=dialog-content]_[data-slot=dialog-title]]:leading-none [&_[data-slot=dialog-content]_[data-slot=dialog-title]]:font-semibold [&_[data-slot=dialog-content]_[data-slot=dialog-description]]:text-sm [&_[data-slot=dialog-content]_[data-slot=dialog-description]]:text-muted-foreground [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:absolute [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:rounded-xs [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:opacity-70 [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:ring-offset-background [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:transition-opacity [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:hover:opacity-100 [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:focus:ring-2 [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:focus:ring-ring [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:focus:ring-offset-2 [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:focus:outline-hidden [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:disabled:pointer-events-none [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:data-[state=open]:bg-accent [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:data-[state=open]:text-muted-foreground [&_[data-slot=dialog-content]_[data-slot=dialog-close]_svg]:pointer-events-none [&_[data-slot=dialog-content]_[data-slot=dialog-close]_svg]:shrink-0 [&_[data-slot=dialog-content]_[data-slot=dialog-close]_svg:not([class*='size-'])]:size-4 [&_[data-slot=dialog-content]_[data-slot=command]]:flex [&_[data-slot=dialog-content]_[data-slot=command]]:h-full [&_[data-slot=dialog-content]_[data-slot=command]]:w-full [&_[data-slot=dialog-content]_[data-slot=command]]:flex-col [&_[data-slot=dialog-content]_[data-slot=command]]:overflow-hidden [&_[data-slot=dialog-content]_[data-slot=command]]:rounded-md [&_[data-slot=dialog-content]_[data-slot=command]]:bg-popover [&_[data-slot=dialog-content]_[data-slot=command]]:text-popover-foreground [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-input-wrapper]]:h-12 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-input-wrapper]_svg]:h-5 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-input-wrapper]_svg]:w-5 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-input]]:h-12 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-group]]:px-2 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-group]:not([hidden])~[data-slot=command-group]]:pt-0 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-group-heading]]:px-2 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-group-heading]]:font-medium [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-group-heading]]:text-muted-foreground [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-item]]:px-2 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-item]]:py-3 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-item]_svg]:h-5 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-item]_svg]:w-5", cls)
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
        cn("flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground", cls)
      }
      {...attrs}
    >
      <C.Input
        class={
          cn("flex h-9 items-center gap-2 border-b px-3 [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:opacity-50 [&>input]:flex [&>input]:h-10 [&>input]:w-full [&>input]:rounded-md [&>input]:bg-transparent [&>input]:py-3 [&>input]:text-sm [&>input]:outline-hidden [&>input]:placeholder:text-muted-foreground [&>input]:disabled:cursor-not-allowed [&>input]:disabled:opacity-50")
        }
      />
      <C.List
        class={
          cn("max-h-[300px] scroll-py-1 overflow-x-hidden overflow-y-auto [&_[data-slot=command-item]]:relative [&_[data-slot=command-item]]:flex [&_[data-slot=command-item]]:cursor-default [&_[data-slot=command-item]]:items-center [&_[data-slot=command-item]]:gap-2 [&_[data-slot=command-item]]:rounded-sm [&_[data-slot=command-item]]:py-1.5 [&_[data-slot=command-item]]:px-2 [&_[data-slot=command-item]]:text-sm [&_[data-slot=command-item]]:outline-hidden [&_[data-slot=command-item]]:select-none [&_[data-slot=command-item]]:data-[disabled=true]:pointer-events-none [&_[data-slot=command-item]]:data-[disabled=true]:opacity-50 [&_[data-slot=command-item]]:data-[selected=true]:bg-accent [&_[data-slot=command-item]]:data-[selected=true]:text-accent-foreground [&_[data-slot=command-item]_svg]:pointer-events-none [&_[data-slot=command-item]_svg]:shrink-0 [&_[data-slot=command-item]_svg:not([class*='size-'])]:size-4 [&_[data-slot=command-item]_svg:not([class*='text-'])]:text-muted-foreground [&_[data-slot=command-item]_[data-slot=command-shortcut]]:ml-auto [&_[data-slot=command-item]_[data-slot=command-shortcut]]:text-xs [&_[data-slot=command-item]_[data-slot=command-shortcut]]:tracking-widest [&_[data-slot=command-item]_[data-slot=command-shortcut]]:text-muted-foreground [&_[data-slot=command-empty]]:py-6 [&_[data-slot=command-empty]]:text-center [&_[data-slot=command-empty]]:text-sm [&_[data-slot=command-group]]:overflow-hidden [&_[data-slot=command-group]]:p-1 [&_[data-slot=command-group]]:text-foreground [&_[data-slot=command-group]_[data-slot=command-group-heading]]:px-2 [&_[data-slot=command-group]_[data-slot=command-group-heading]]:py-1.5 [&_[data-slot=command-group]_[data-slot=command-group-heading]]:text-xs [&_[data-slot=command-group]_[data-slot=command-group-heading]]:font-medium [&_[data-slot=command-group]_[data-slot=command-group-heading]]:text-muted-foreground")
        }
      />
      {children}
    </div>
  );
}

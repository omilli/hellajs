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

interface CommandDialogProps extends CommandProps {
  open: () => boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}
import { cn } from "./cn.js";

export type { CommandItemData };

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
        cn("[&_[data-slot=dialog-overlay]]:fixed [&_[data-slot=dialog-overlay]]:inset-0 [&_[data-slot=dialog-overlay]]:z-50 [&_[data-slot=dialog-overlay]]:bg-black/50 [&_[data-slot=dialog-overlay]]:data-[state=closed]:animate-out [&_[data-slot=dialog-overlay]]:data-[state=closed]:fade-out-0 [&_[data-slot=dialog-overlay]]:data-[state=open]:animate-in [&_[data-slot=dialog-overlay]]:data-[state=open]:fade-in-0 [&_[data-slot=dialog-content]]:fixed [&_[data-slot=dialog-content]]:top-[50%] [&_[data-slot=dialog-content]]:left-[50%] [&_[data-slot=dialog-content]]:z-50 [&_[data-slot=dialog-content]]:grid [&_[data-slot=dialog-content]]:w-full [&_[data-slot=dialog-content]]:max-w-[calc(100%-2rem)] [&_[data-slot=dialog-content]]:translate-x-[-50%] [&_[data-slot=dialog-content]]:translate-y-[-50%] [&_[data-slot=dialog-content]]:gap-4 [&_[data-slot=dialog-content]]:rounded-lg [&_[data-slot=dialog-content]]:border [&_[data-slot=dialog-content]]:bg-background [&_[data-slot=dialog-content]]:p-0 [&_[data-slot=dialog-content]]:shadow-lg [&_[data-slot=dialog-content]]:duration-200 [&_[data-slot=dialog-content]]:outline-none [&_[data-slot=dialog-content]]:overflow-hidden [&_[data-slot=dialog-content]]:data-[state=closed]:animate-out [&_[data-slot=dialog-content]]:data-[state=closed]:fade-out-0 [&_[data-slot=dialog-content]]:data-[state=closed]:zoom-out-95 [&_[data-slot=dialog-content]]:data-[state=open]:animate-in [&_[data-slot=dialog-content]]:data-[state=open]:fade-in-0 [&_[data-slot=dialog-content]]:data-[state=open]:zoom-in-95 [&_[data-slot=dialog-content]]:sm:max-w-lg [&_[data-slot=dialog-content]_[data-slot=dialog-header]]:sr-only [&_[data-slot=dialog-content]_[data-slot=dialog-title]]:text-lg [&_[data-slot=dialog-content]_[data-slot=dialog-title]]:leading-none [&_[data-slot=dialog-content]_[data-slot=dialog-title]]:font-semibold [&_[data-slot=dialog-content]_[data-slot=dialog-description]]:text-sm [&_[data-slot=dialog-content]_[data-slot=dialog-description]]:text-muted-foreground [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:absolute [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:rounded-xs [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:opacity-70 [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:ring-offset-background [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:transition-opacity [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:hover:opacity-100 [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:focus:ring-2 [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:focus:ring-ring [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:focus:ring-offset-2 [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:focus:outline-hidden [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:disabled:pointer-events-none [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:data-[state=open]:bg-accent [&_[data-slot=dialog-content]_[data-slot=dialog-close]]:data-[state=open]:text-muted-foreground [&_[data-slot=dialog-content]_[data-slot=dialog-close]_svg]:pointer-events-none [&_[data-slot=dialog-content]_[data-slot=dialog-close]_svg]:shrink-0 [&_[data-slot=dialog-content]_[data-slot=dialog-close]_svg:not([class*='size-'])]:size-4 [&_[data-slot=dialog-content]_[data-slot=command]]:flex [&_[data-slot=dialog-content]_[data-slot=command]]:h-full [&_[data-slot=dialog-content]_[data-slot=command]]:w-full [&_[data-slot=dialog-content]_[data-slot=command]]:flex-col [&_[data-slot=dialog-content]_[data-slot=command]]:overflow-hidden [&_[data-slot=dialog-content]_[data-slot=command]]:rounded-md [&_[data-slot=dialog-content]_[data-slot=command]]:bg-popover [&_[data-slot=dialog-content]_[data-slot=command]]:text-popover-foreground [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-input-wrapper]]:h-12 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-input-wrapper]_svg]:h-5 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-input-wrapper]_svg]:w-5 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-input]]:h-12 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-group]]:px-2 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-group]:not([hidden])~[data-slot=command-group]]:pt-0 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-group-heading]]:px-2 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-group-heading]]:font-medium [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-group-heading]]:text-muted-foreground [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-item]]:px-2 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-item]]:py-3 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-item]_svg]:h-5 [&_[data-slot=dialog-content]_[data-slot=command]_[data-slot=command-item]_svg]:w-5", cls)
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

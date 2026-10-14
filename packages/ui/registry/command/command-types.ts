import type { HTMLAttributes, HellaChild, HellaChildren } from "@hellajs/dom";

export interface CommandItemData {
  value: string;
  label: string;
  group?: string;
  keywords?: string[];
  shortcut?: string;
  disabled?: boolean;
  onSelect?: () => void;
}

export interface RankedItem {
  item: CommandItemData;
  score: number;
}

export interface CommandInputProps extends HTMLAttributes<"input"> {
  class?: string;
}

export interface CommandListProps extends HTMLAttributes<"div"> {
  /** Reactive items body; a thunk so the composed root's re-ranked list re-renders through the slot. */
  body?: () => HellaChild | HellaChild[];
  children?: HellaChildren;
  class?: string;
}

export interface CommandEmptyProps extends HTMLAttributes<"div"> {
  children?: HellaChildren;
  class?: string;
}

export interface CommandGroupProps extends HTMLAttributes<"div"> {
  heading?: string;
  hidden?: boolean | (() => boolean);
  children?: HellaChildren;
  class?: string;
}

export interface CommandSeparatorProps extends HTMLAttributes<"div"> {
  class?: string;
}

export interface CommandItemProps extends HTMLAttributes<"div"> {
  value?: string;
  /** Selected state (the ref's data-selected accent); an accessor follows the owning command's active item. */
  active?: () => boolean;
  /** Called on click and on Enter when the owning command commits. */
  onSelect?: () => void;
  children?: HellaChildren;
  class?: string;
}

export interface CommandShortcutProps extends HTMLAttributes<"span"> {
  children?: HellaChildren;
  class?: string;
}

export interface CommandProps extends HTMLAttributes<"div"> {
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

export interface CommandDialogProps extends HTMLAttributes<"div"> {
  open: () => boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  class?: string;
  children?: HellaChildren;
}

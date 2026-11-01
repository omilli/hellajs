import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

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

export interface CommandDialogProps extends CommandProps {
  open: () => boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

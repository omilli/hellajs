import type { HTMLAttributes, HellaChild } from "@hellajs/dom";

export interface TabsItem {
  id: string;
  label: string;
  content: HellaChild | (() => HellaChild);
}

export interface TabsProps extends HTMLAttributes<"div"> {
  class?: string;
  /** The rendered tabs. An array reads statically at mount; an accessor keeps the list reactive across appends, removes, and reorders. Items auto-key by `id`, so reorders preserve trigger and panel identity. */
  items: TabsItem[] | (() => TabsItem[]);
  initialId?: string;
  /** Controlled active tab. When given, the root never writes its internal state and `onValueChange` reports the requested selection. */
  value?: () => string;
  /** Called with every root-driven selection; re-selecting the active tab notifies no one. */
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "line";
}

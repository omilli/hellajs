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
  orientation?: "horizontal" | "vertical";
  variant?: "default" | "line";
}

export interface TabsListProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChild | HellaChild[];
  variant?: "default" | "line";
  orientation?: "horizontal" | "vertical";
}

export interface TabsTriggerProps extends HTMLAttributes<"button"> {
  class?: string;
  /** The raw TabsItem id - the DOM id is `${TAB_ID}${id}`. */
  id?: string;
  /** The tab's value key; wins over `id` when both are given. */
  value?: string;
  children?: HellaChild;
  active?: () => boolean;
  onActivate?: () => void;
  orientation?: "horizontal" | "vertical";
  listVariant?: "default" | "line";
}

export interface TabsContentProps extends HTMLAttributes<"div"> {
  class?: string;
  /** The raw TabsItem id - the DOM id is `${PANEL_ID}${id}`. */
  id?: string;
  /** The panel's value key; wins over `id` when both are given. */
  value?: string;
  children?: HellaChild | (() => HellaChild);
  active?: () => boolean;
}

import type { HTMLAttributes } from "@hellajs/dom";

export interface ComboboxEntry {
  value: string;
  label?: string;
  disabled?: boolean;
}

export interface ComboboxProps extends HTMLAttributes<"div"> {
  items?: ComboboxEntry[] | (() => ComboboxEntry[]);
  /** Reuses option DOM through reorders by `value` identity (selection state survives); order always follows the array. */
  keyBy?: "value";
  /** Controlled selection. Single mode holds one value; multiple mode holds an array. When given, the root never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string | string[];
  onValueChange?: (value: string | string[]) => void;
  multiple?: boolean;
  /** Replaces the default case-insensitive substring filter over item labels. */
  filter?: (items: ComboboxEntry[], query: string) => ComboboxEntry[];
  /** Renders the input's clear affordance while a value is selected. */
  showClear?: boolean;
  class?: string;
}

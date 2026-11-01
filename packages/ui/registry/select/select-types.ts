import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface SelectEntry {
  value: string;
  label?: HellaChildren;
  disabled?: boolean;
}

export interface SelectProps extends HTMLAttributes<"button"> {
  id?: string;
  disabled?: boolean;
  items?: SelectEntry[] | (() => SelectEntry[]);
  /** Reuses option DOM through reorders by `value` identity (selection state survives); order always follows the array. */
  keyBy?: "value";
  /** Controlled selected value. When given, the root never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  size?: "sm" | "default";
  /** Renders the trigger's clear affordance while a value is selected. */
  clearable?: boolean;
  class?: string;
}

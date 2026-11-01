import type { HTMLAttributes } from "@hellajs/dom";

export interface RadioGroupEntry {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  /** The rendered options. An array reads statically at mount; an accessor keeps the list reactive across appends, removes, and reorders. */
  items: RadioGroupEntry[] | (() => RadioGroupEntry[]);
  /** Reuses item DOM through reorders by `value` identity (selection state survives); order always follows the array. */
  keyBy?: "value";
  /** Controlled selected value. When given, the root never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
}

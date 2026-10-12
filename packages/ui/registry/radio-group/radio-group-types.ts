import type { HTMLAttributes } from "@hellajs/dom";

export interface RadioGroupItem {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface RadioGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  items: RadioGroupItem[];
  /** Controlled selected value. When given, the root never writes its internal signal and `onValueChange` reports the requested selection. */
  value?: () => string;
  onValueChange?: (value: string) => void;
  orientation?: "horizontal" | "vertical";
}

export interface RadioGroupItemProps extends HTMLAttributes<"button"> {
  class?: string;
  value: string;
  /** Checked state. A boolean reads statically; an accessor keeps the manual part reactive. */
  checked?: boolean | (() => boolean);
  onSelect?: () => void;
}

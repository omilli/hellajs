import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface NativeSelectProps extends HTMLAttributes<"select"> {
  class?: string;
  children?: HellaChildren;
  value?: string | (() => string);
  size?: "sm" | "default";
}

export interface NativeSelectOptionProps extends HTMLAttributes<"option"> {
  class?: string;
  children?: HellaChildren;
}

export interface NativeSelectOptGroupProps extends HTMLAttributes<"optgroup"> {
  class?: string;
  children?: HellaChildren;
}

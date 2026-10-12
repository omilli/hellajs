import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface DirectionProviderProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  dir?: "ltr" | "rtl";
}

import type { HTMLAttributes, HellaChildren } from "@hellajs/dom";

export interface ResizablePanelGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  direction?: "horizontal" | "vertical";
  /** Reports the panel sizes (percentages) after each drag or keyboard resize. The initial layout does not fire it. */
  onLayout?: (sizes: number[]) => void;
}

export interface ResizablePanelProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  /** Initial share of the group, in percent. The group rewrites `flex-grow` as handles resize the pair. */
  defaultSize: number;
  minSize?: number;
  maxSize?: number;
}

export interface ResizableHandleProps extends HTMLAttributes<"div"> {
  class?: string;
  withHandle?: boolean;
}

import type { HTMLAttributes } from "@hellajs/dom";

export type ProgressValue = number | null | undefined;

export interface ProgressProps extends HTMLAttributes<"div"> {
  class?: string;
  /** 0-100; null (or a reactive fn reading null) drives the indeterminate state. */
  value?: number | null | (() => number | null);
}

import type { HTMLAttributes } from "@hellajs/dom";
import { cn } from "./cn.js";

type ProgressValue = number | null | undefined;

interface ProgressProps extends HTMLAttributes<"div"> {
  class?: string;
  /** 0-100; null (or a reactive fn reading null) drives the indeterminate state. */
  value?: number | null | (() => number | null);
}

export default function Progress({ value, class: cls, ...attrs }: ProgressProps): JSX.Element {
  const current = (): ProgressValue => (typeof value === "function" ? value() : value);
  // Null reads as indeterminate: renderProp drops the attribute, matching Radix's omitted aria-valuenow.
  const state = (): string => {
    const v = current();
    return v == null ? "indeterminate" : v >= 100 ? "complete" : "loading";
  };
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={() => current() as number}
      data-state={state}
      class={
        cn("relative h-2 w-full overflow-hidden rounded-full bg-primary/20", cls)
      }
      {...attrs}
    >
      <div
        data-slot="progress-indicator"
        data-state={state}
        style={() => ({ transform: `translateX(-${100 - (current() ?? 0)}%)` })}
        class={
          cn("h-full w-full flex-1 bg-primary transition-all")
        }
      />
    </div>
  );
}

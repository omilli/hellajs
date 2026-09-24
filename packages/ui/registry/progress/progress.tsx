import type { HellaNode } from "@hellajs/dom";

// @hella:styles
// @hella:end

type ProgressValue = number | null | undefined;

interface ProgressProps {
  /** 0-100; null (or a reactive fn reading null) drives the indeterminate state. */
  value?: number | null | (() => number | null);
  class?: string;
}

export default function Progress(props: ProgressProps): JSX.Element {
  const current = (): ProgressValue => (typeof props.value === "function" ? props.value() : props.value);
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
        // @hella:compose
        [base, props.class]
        // @hella:end
      }
    >
      <div
        data-slot="progress-indicator"
        data-state={state}
        style={() => ({ transform: `translateX(-${100 - (current() ?? 0)}%)` })}
        class={
          // @hella:compose
          [indicator]
          // @hella:end
        }
      />
    </div>
  );
}

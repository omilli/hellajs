import { slider } from "@hellajs/headless";
import type { HTMLAttributes } from "@hellajs/dom";

interface SliderProps extends HTMLAttributes<"span"> {
  class?: string;
  /** The thumb values. A static array seeds the internal signal; an accessor makes the slider controlled, so writes report through `onValueChange` only. */
  value?: number[] | (() => number[]);
  onValueChange?: (value: number[]) => void;
  /** Fired when an interaction ends: drag release and each accepted keyboard change. */
  onValueCommit?: (value: number[]) => void;
  orientation?: "horizontal" | "vertical";
  /** Minimum number of steps enforced between neighboring thumbs. */
  minStepsBetweenThumbs?: number;
}
import { cn } from "./cn.js";

export function Slider({
  value,
  onValueChange,
  onValueCommit,
  orientation: orientationProp,
  minStepsBetweenThumbs,
  min: minAttr,
  max: maxAttr,
  step: stepAttr,
  disabled,
  class: cls,
  ...attrs
}: SliderProps): JSX.Element {
  const min = (minAttr as number | undefined) ?? 0;
  const max = (maxAttr as number | undefined) ?? 100;

  const { Root, Track, Range, Thumb } = slider({
    value,
    onValueChange,
    onValueCommit,
    min: minAttr as number | undefined,
    max: maxAttr as number | undefined,
    step: stepAttr as number | undefined,
    orientation: orientationProp,
    minStepsBetweenThumbs,
    disabled: Boolean(disabled),
  });

  // Thumb count is fixed at mount; value updates move the thumbs but never add or remove them.
  const thumbCount = Math.max(
    (typeof value === "function" ? value() : (value ?? [min, max])).length,
    1,
  );

  return (
    <Root
      class={
        cn("relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col", cls)
      }
      {...attrs}
    >
      <Track
        class={
          cn("relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5")
        }
      >
        <Range
          class={
            cn("absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full")
          }
        />
      </Track>
      {Array.from({ length: thumbCount }, (_, index) => (
        <Thumb
          index={index}
          class={
            cn("block size-4 shrink-0 rounded-full border border-primary bg-white shadow-sm ring-ring/50 transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50")
          }
        />
      ))}
    </Root>
  );
}

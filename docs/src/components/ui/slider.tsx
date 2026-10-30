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

import { style } from "@hellajs/css";
import { tokens } from "./tokens.js";

const base = style("slider", {
  alignItems: "center",
  display: "flex",
  position: "relative",
  touchAction: "none",
  userSelect: "none",
  width: "100%",
  "&[data-disabled]": {
    opacity: "0.5",
  },
  "&[data-orientation='vertical']": {
    flexDirection: "column",
    height: "100%",
    minHeight: "11rem",
    width: "auto",
  },
});

const track = style("slider-track", {
  borderRadius: "9999px",
  backgroundColor: tokens.muted,
  flexGrow: "1",
  overflow: "hidden",
  position: "relative",
  "&[data-orientation='horizontal']": {
    height: "0.375rem",
    width: "100%",
  },
  "&[data-orientation='vertical']": {
    height: "100%",
    width: "0.375rem",
  },
});

const range = style("slider-range", {
  backgroundColor: tokens.primary,
  position: "absolute",
  "&[data-orientation='horizontal']": {
    height: "100%",
  },
  "&[data-orientation='vertical']": {
    width: "100%",
  },
});

const thumb = style("slider-thumb", {
  backgroundColor: "#fff",
  border: `1px solid ${tokens.primary}`,
  borderRadius: "9999px",
  boxSizing: "border-box",
  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  display: "block",
  flexShrink: "0",
  height: "1rem",
  outlineStyle: "none",
  transition:
    "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "1rem",
  "&:hover": {
    boxShadow: `0 0 0 4px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:focus-visible": {
    boxShadow: `0 0 0 4px color-mix(in oklab, ${tokens.ring} 50%, transparent)`,
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
});

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
        [base, cls]
      }
      {...attrs}
    >
      <Track
        class={
          [track]
        }
      >
        <Range
          class={
            [range]
          }
        />
      </Track>
      {Array.from({ length: thumbCount }, (_, index) => (
        <Thumb
          index={index}
          class={
            [thumb]
          }
        />
      ))}
    </Root>
  );
}

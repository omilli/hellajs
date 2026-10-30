import { slider } from "@hellajs/headless";
import type { SliderProps } from "./slider-types.js";

// @hella:styles
declare const base: string;
declare const range: string;
declare const thumb: string;
declare const track: string;
// @hella:end

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
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      {...attrs}
    >
      <Track
        class={
          // @hella:compose
          [track]
          // @hella:end
        }
      >
        <Range
          class={
            // @hella:compose
            [range]
            // @hella:end
          }
        />
      </Track>
      {Array.from({ length: thumbCount }, (_, index) => (
        <Thumb
          index={index}
          class={
            // @hella:compose
            [thumb]
            // @hella:end
          }
        />
      ))}
    </Root>
  );
}

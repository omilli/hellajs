import { signal } from "@hellajs/core";
import { onDrag } from "@hellajs/dom";
import type { HTMLAttributes } from "@hellajs/dom";

// @hella:styles
declare const base: string;
declare const range: string;
declare const thumb: string;
declare const track: string;
// @hella:end

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

export default function Slider({ value, onValueChange, onValueCommit, orientation: orientationProp, minStepsBetweenThumbs, min: minAttr, max: maxAttr, step: stepAttr, disabled, class: cls, ...attrs }: SliderProps): JSX.Element {
  const min = (minAttr as number | undefined) ?? 0;
  const max = (maxAttr as number | undefined) ?? 100;
  const step = (stepAttr as number | undefined) ?? 1;
  const orientation = orientationProp ?? "horizontal";
  const minSteps = minStepsBetweenThumbs ?? 0;

  const internal = signal<number[]>(
    typeof value === "function" ? [] : value ?? [min, max],
  );
  const values = (): number[] =>
    typeof value === "function" ? value() : internal();

  // Thumb count is fixed at mount; value updates move the thumbs but never add or remove them.
  const thumbCount = Math.max(values().length, 1);

  const decimals = (String(step).split(".")[1] ?? "").length;
  const quantize = (raw: number): number => {
    const stepped = min + Math.round((raw - min) / step) * step;
    return Number(Math.min(max, Math.max(min, stepped)).toFixed(decimals));
  };

  const pct = (v: number): number => ((v - min) / (max - min)) * 100;

  const applyLimits = (index: number, candidate: number, current: number[]): number => {
    let next = candidate;
    const gap = minSteps * step;
    if (index > 0) next = Math.max(next, current[index - 1]! + gap);
    if (index < current.length - 1) next = Math.min(next, current[index + 1]! - gap);
    return Math.min(max, Math.max(min, next));
  };

  const setValue = (index: number, next: number): void => {
    const current = values();
    if (current[index] === next) return;
    const updated = current.slice();
    updated[index] = next;
    if (typeof value !== "function") internal(updated);
    onValueChange?.(updated);
  };

  const pointerValue = (clientX: number, clientY: number, rect: DOMRect): number => {
    if (orientation === "vertical") {
      if (rect.height <= 0) return Number.NaN;
      return min + (1 - (clientY - rect.top) / rect.height) * (max - min);
    }
    if (rect.width <= 0) return Number.NaN;
    return min + ((clientX - rect.left) / rect.width) * (max - min);
  };

  const rangeStyle = (): Record<string, string> => {
    const current = values();
    const start = pct(Math.min(...current));
    const end = pct(Math.max(...current));
    return orientation === "vertical"
      ? { bottom: `${start}%`, height: `${end - start}%` }
      : { left: `${start}%`, width: `${end - start}%` };
  };

  const thumbStyle = (index: number): Record<string, string> => {
    const at = `${pct(values()[index] ?? min)}%`;
    return orientation === "vertical"
      ? { pointerEvents: "auto", position: "absolute", left: "50%", bottom: at, transform: "translate(-50%, 50%)" }
      : { pointerEvents: "auto", position: "absolute", top: "50%", left: at, transform: "translate(-50%, -50%)" };
  };

  const stepFromKey = (key: string, from: number): number | null => {
    if (key === "ArrowLeft" || key === "ArrowDown") return from - step;
    if (key === "ArrowRight" || key === "ArrowUp") return from + step;
    if (key === "PageDown") return from - step * 10;
    if (key === "PageUp") return from + step * 10;
    if (key === "Home") return min;
    if (key === "End") return max;
    return null;
  };

  const wirings: (() => void)[] = [];
  let activeIndex = -1;
  let trackRect: DOMRect | null = null;

  return (
    <span
      data-slot="slider"
      data-orientation={orientation}
      data-disabled={disabled ? "true" : undefined}
      min={min}
      max={max}
      step={step}
      class={
        // @hella:compose
        [base, cls]
        // @hella:end
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        wirings.push(onDrag(node, {
          onStart: (event) => {
            if (disabled) return;
            const trackEl = node.querySelector<HTMLElement>("[data-slot='slider-track']");
            if (!trackEl) return;
            const rect = trackEl.getBoundingClientRect();
            const pointer = pointerValue(event.clientX, event.clientY, rect);
            if (Number.isNaN(pointer)) return;
            trackRect = rect;
            const current = values();
            let nearest = 0;
            let i = 1;
            while (i < current.length) {
              if (Math.abs(current[i]! - pointer) < Math.abs(current[nearest]! - pointer)) nearest = i;
              i++;
            }
            activeIndex = nearest;
            setValue(nearest, applyLimits(nearest, quantize(pointer), current));
          },
          onMove: (delta) => {
            if (activeIndex < 0 || !trackRect) return;
            const pointer = pointerValue(delta.event.clientX, delta.event.clientY, trackRect);
            if (Number.isNaN(pointer)) return;
            setValue(activeIndex, applyLimits(activeIndex, quantize(pointer), values()));
          },
          onEnd: () => {
            if (activeIndex < 0) return;
            activeIndex = -1;
            trackRect = null;
            onValueCommit?.(values());
          },
        }));
      }}
      hook:beforeDestroy={() => {
        while (wirings.length) wirings.pop()!();
      }}
      {...attrs}
    >
      <span data-slot="slider-track" data-orientation={orientation} class={
        // @hella:compose
        [track]
        // @hella:end
      }>
        <span data-slot="slider-range" data-orientation={orientation} style={rangeStyle} class={
          // @hella:compose
          [range]
          // @hella:end
        } />
      </span>
      {Array.from({ length: thumbCount }, (_, index) => (
        <span
          data-slot="slider-thumb"
          role="slider"
          tabindex={disabled ? -1 : 0}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={() => values()[index] as number}
          aria-orientation={orientation}
          aria-disabled={disabled ? "true" : undefined}
          style={() => thumbStyle(index)}
          on:keydown={(event: KeyboardEvent) => {
            if (disabled) return;
            const current = values();
            const raw = stepFromKey(event.key, current[index] ?? min);
            if (raw === null) return;
            event.preventDefault();
            setValue(index, applyLimits(index, quantize(raw), current));
            onValueCommit?.(values());
          }}
          class={
            // @hella:compose
            [thumb]
            // @hella:end
          }
        />
      ))}
    </span>
  );
}

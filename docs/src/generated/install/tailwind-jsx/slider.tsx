import { signal } from "@hellajs/core";
import { onDrag } from "@hellajs/dom";
import { cn } from "./cn.js";

const track = "relative grow overflow-hidden rounded-full bg-muted data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5";

const thumb = "block size-4 shrink-0 rounded-full border border-primary bg-white shadow-sm ring-ring/50 transition-[color,box-shadow] hover:ring-4 focus-visible:ring-4 focus-visible:outline-hidden disabled:pointer-events-none disabled:opacity-50";

interface SliderProps {
  /** The thumb values. A static array seeds the internal signal; an accessor makes the slider controlled, so writes report through `onValueChange` only. */
  value?: number[] | (() => number[]);
  onValueChange?: (value: number[]) => void;
  /** Fired when an interaction ends: drag release and each accepted keyboard change. */
  onValueCommit?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  orientation?: "horizontal" | "vertical";
  disabled?: boolean;
  /** Minimum number of steps enforced between neighboring thumbs. */
  minStepsBetweenThumbs?: number;
  class?: string;
}

export default function Slider(props: SliderProps): JSX.Element {
  const min = props.min ?? 0;
  const max = props.max ?? 100;
  const step = props.step ?? 1;
  const orientation = props.orientation ?? "horizontal";
  const minSteps = props.minStepsBetweenThumbs ?? 0;

  const internal = signal<number[]>(
    typeof props.value === "function" ? [] : props.value ?? [min, max],
  );
  const values = (): number[] =>
    typeof props.value === "function" ? props.value() : internal();

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
    if (typeof props.value !== "function") internal(updated);
    props.onValueChange?.(updated);
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
      data-disabled={props.disabled ? "true" : undefined}
      class={
        cn("relative flex w-full touch-none items-center select-none data-[disabled]:opacity-50 data-[orientation=vertical]:h-full data-[orientation=vertical]:min-h-44 data-[orientation=vertical]:w-auto data-[orientation=vertical]:flex-col", props.class)
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        wirings.push(onDrag(node, {
          onStart: (event) => {
            if (props.disabled) return;
            const track = node.querySelector<HTMLElement>("[data-slot='slider-track']");
            if (!track) return;
            const rect = track.getBoundingClientRect();
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
            props.onValueCommit?.(values());
          },
        }));
      }}
      hook:beforeDestroy={() => {
        while (wirings.length) wirings.pop()!();
      }}
    >
      <span data-slot="slider-track" data-orientation={orientation} class={
        cn(track)
      }>
        <span data-slot="slider-range" data-orientation={orientation} style={rangeStyle} class={
          cn("absolute bg-primary data-[orientation=horizontal]:h-full data-[orientation=vertical]:w-full")
        } />
      </span>
      {Array.from({ length: thumbCount }, (_, index) => (
        <span
          data-slot="slider-thumb"
          role="slider"
          tabindex={props.disabled ? -1 : 0}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={() => values()[index] as number}
          aria-orientation={orientation}
          aria-disabled={props.disabled ? "true" : undefined}
          style={() => thumbStyle(index)}
          on:keydown={(event: KeyboardEvent) => {
            if (props.disabled) return;
            const current = values();
            const raw = stepFromKey(event.key, current[index] ?? min);
            if (raw === null) return;
            event.preventDefault();
            setValue(index, applyLimits(index, quantize(raw), current));
            props.onValueCommit?.(values());
          }}
          class={
            cn(thumb)
          }
        />
      ))}
    </span>
  );
}

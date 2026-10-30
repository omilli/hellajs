import { isFunction, signal } from "@hellajs/core";
import { onDrag } from "./utils/onDrag";
import type {
  SliderOptions,
  SliderComponents,
  SliderRangeProps,
  SliderRootProps,
  SliderThumbProps,
  SliderTrackProps,
} from "./types/components";

/**
 * Creates the slider part set: `Root` + `Track` + `Range` + `Thumb`. The
 * closure owns the thumb values — controlled through a `value` accessor when
 * passed, an internal signal seeded `value ?? [min, max]` when omitted — and
 * reports every accepted move through `onValueChange`. `Root` arms the pointer
 * drag: pointerdown picks the nearest thumb, movement maps track position to a
 * stepped, clamped value, and release fires `onValueCommit`. `Thumb` renders
 * the focusable `role="slider"` span with arrow/Page/Home/End stepping, each
 * accepted key committing too. The thumb count is the value array's length,
 * fixed at mount. Call in component scope so the state signal disposes with
 * the component.
 *
 * ```tsx
 * const Slider = slider({ value, onValueChange });
 *
 * <Slider.Root>
 *   <Slider.Track>
 *     <Slider.Range />
 *   </Slider.Track>
 *   <Slider.Thumb index={0} />
 * </Slider.Root>
 * ```
 * @param options controlled `value`, `min`/`max`/`step` range math, `orientation`, `minStepsBetweenThumbs`, `disabled`, and the change/commit callbacks; an omitted `value` keeps state internal.
 * @returns The part set, composed as `Slider.Root`-style members.
 */
export function slider(options: SliderOptions = {}): SliderComponents {
  const value = options.value;
  const onValueChange = options.onValueChange;
  const onValueCommit = options.onValueCommit;
  const min = options.min ?? 0;
  const max = options.max ?? 100;
  const step = options.step ?? 1;
  const orientation = options.orientation ?? "horizontal";
  const minSteps = options.minStepsBetweenThumbs ?? 0;
  const disabled = options.disabled;

  const internal = signal<number[]>(isFunction(value) ? [] : (value ?? [min, max]));
  const values = (): number[] => (isFunction(value) ? value() : internal());

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
    if (!isFunction(value)) internal(updated);
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
      ? {
          pointerEvents: "auto",
          position: "absolute",
          left: "50%",
          bottom: at,
          transform: "translate(-50%, 50%)",
        }
      : {
          pointerEvents: "auto",
          position: "absolute",
          top: "50%",
          left: at,
          transform: "translate(-50%, -50%)",
        };
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

  const Root = (props: SliderRootProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <span
        data-slot="slider"
        data-orientation={orientation}
        data-disabled={disabled ? "true" : undefined}
        min={min}
        max={max}
        step={step}
        class={cls}
        hook:afterMount={(node) => {
          if (!(node instanceof HTMLElement)) return;
          wirings.push(
            onDrag(node, {
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
                  if (Math.abs(current[i]! - pointer) < Math.abs(current[nearest]! - pointer))
                    nearest = i;
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
            }),
          );
        }}
        hook:beforeDestroy={() => {
          while (wirings.length) wirings.pop()!();
        }}
        {...attrs}
      >
        {children}
      </span>
    );
  };

  const Track = (props: SliderTrackProps): JSX.Element => {
    const { children, class: cls, ...attrs } = props;
    return (
      <span data-slot="slider-track" data-orientation={orientation} class={cls} {...attrs}>
        {children}
      </span>
    );
  };

  const Range = (props: SliderRangeProps): JSX.Element => {
    const { class: cls, ...attrs } = props;
    return (
      <span
        data-slot="slider-range"
        data-orientation={orientation}
        style={rangeStyle}
        class={cls}
        {...attrs}
      />
    );
  };

  const Thumb = (props: SliderThumbProps): JSX.Element => {
    const { index, class: cls, ...attrs } = props;
    return (
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
        class={cls}
        {...attrs}
      />
    );
  };

  return { Root, Track, Range, Thumb };
}

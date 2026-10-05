import { html, onDrag } from "@hellajs/dom";
import { signal } from "@hellajs/core";
import type { HellaNode } from "@hellajs/dom";

import { style } from "@hellajs/css";

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
  backgroundColor: "var(--muted)",
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
  backgroundColor: "var(--primary)",
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
  border: "1px solid var(--primary)",
  borderRadius: "9999px",
  boxSizing: "border-box",
  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
  display: "block",
  flexShrink: "0",
  height: "1rem",
  outlineStyle: "none",
  transition: "color 150ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 150ms cubic-bezier(0.4, 0, 0.2, 1)",
  width: "1rem",
  "&:hover": {
    boxShadow: "0 0 0 4px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:focus-visible": {
    boxShadow: "0 0 0 4px color-mix(in oklab, var(--ring) 50%, transparent)",
  },
  "&:disabled": {
    opacity: "0.5",
    pointerEvents: "none",
  },
});

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

export default function Slider(props: SliderProps): HellaNode {
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

  const rangeStyle = (): string => {
    const current = values();
    const start = pct(Math.min(...current));
    const end = pct(Math.max(...current));
    return orientation === "vertical"
      ? `bottom: ${start}%; height: ${end - start}%`
      : `left: ${start}%; width: ${end - start}%`;
  };

  const thumbStyle = (index: number): string => {
    const at = `${pct(values()[index] ?? min)}%`;
    return orientation === "vertical"
      ? `pointer-events: auto; position: absolute; left: 50%; bottom: ${at}; transform: translate(-50%, 50%)`
      : `pointer-events: auto; position: absolute; top: 50%; left: ${at}; transform: translate(-50%, -50%)`;
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

  const thumbNode = (index: number): HellaNode =>
    html`<span
      data-slot="slider-thumb"
      role="slider"
      tabindex="${props.disabled ? -1 : 0}"
      aria-valuemin="${min}"
      aria-valuemax="${max}"
      aria-valuenow="${() => values()[index]}"
      aria-orientation="${orientation}"
      aria-disabled="${props.disabled ? "true" : undefined}"
      style="${() => thumbStyle(index)}"
      e:keydown="${(event: KeyboardEvent) => {
        if (props.disabled) return;
        const current = values();
        const raw = stepFromKey(event.key, current[index] ?? min);
        if (raw === null) return;
        event.preventDefault();
        setValue(index, applyLimits(index, quantize(raw), current));
        props.onValueCommit?.(values());
      }}"
      class="${
        [thumb]
      }"
    />` as HellaNode;

  return html`
    <span
      data-slot="slider"
      data-orientation="${orientation}"
      data-disabled="${props.disabled ? "true" : undefined}"
      class="${
        [base, props.class]
      }"
      hook:afterMount="${(node: Element) => {
        if (!(node instanceof HTMLElement)) return;
        wirings.push(onDrag(node, {
          onStart: (event) => {
            if (props.disabled) return;
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
            props.onValueCommit?.(values());
          },
        }));
      }}"
      hook:beforeDestroy="${() => {
        while (wirings.length) wirings.pop()!();
      }}"
    >
      <span
        data-slot="slider-track"
        data-orientation="${orientation}"
        class="${
          [track]
        }"
      >
        <span
          data-slot="slider-range"
          data-orientation="${orientation}"
          style="${rangeStyle}"
          class="${
            [range]
          }"
        />
      </span>
      ${Array.from({ length: thumbCount }, (_, index) => thumbNode(index))}
    </span>
  ` as HellaNode;
}

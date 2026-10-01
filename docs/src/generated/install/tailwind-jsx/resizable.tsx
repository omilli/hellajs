import { effect, signal } from "@hellajs/core";
import { onDrag } from "@hellajs/dom";
import type { HellaChildren } from "@hellajs/dom";
import { cn } from "./cn.js";

interface ResizablePanelGroupProps {
  direction?: "horizontal" | "vertical";
  /** Reports the panel sizes (percentages) after each drag or keyboard resize. The initial layout does not fire it. */
  onLayout?: (sizes: number[]) => void;
  children?: HellaChildren;
  class?: string;
}

interface ResizablePanelProps {
  /** Initial share of the group, in percent. The group rewrites `flex-grow` as handles resize the pair. */
  defaultSize: number;
  minSize?: number;
  maxSize?: number;
  children?: HellaChildren;
  class?: string;
}

interface ResizableHandleProps {
  withHandle?: boolean;
  disabled?: boolean;
  class?: string;
}

/** The grip visual (refs/icons/grip-vertical.svg), created per call so clones never share nodes. */
const gripIcon = (): JSX.Element => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class={
      cn("size-2.5")
    }
  >
    <circle cx="9" cy="5" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="5" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="19" r="1" />
  </svg>
);

export function ResizablePanel(props: ResizablePanelProps): JSX.Element {
  const minSize = props.minSize ?? 0;
  const maxSize = props.maxSize ?? 100;
  return (
    <div
      data-slot="resizable-panel"
      data-default-size={props.defaultSize}
      data-min-size={minSize}
      data-max-size={maxSize}
      style={{ flex: `${props.defaultSize} 1 0%` }}
      class={props.class}
    >
      {() => props.children}
    </div>
  );
}

export function ResizableHandle(props: ResizableHandleProps): JSX.Element {
  return (
    <div
      data-slot="resizable-handle"
      role="separator"
      tabindex={props.disabled ? -1 : 0}
      aria-orientation="horizontal"
      aria-disabled={props.disabled ? "true" : undefined}
      data-disabled={props.disabled ? "true" : undefined}
      class={
        cn("relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 [&[aria-orientation=horizontal]>div]:rotate-90", props.class)
      }
    >
      {props.withHandle && (
        <div class={
          cn("z-10 flex h-4 w-3 items-center justify-center rounded-xs border bg-border")
        }>
          {gripIcon()}
        </div>
      )}
    </div>
  );
}

export default function ResizablePanelGroup(props: ResizablePanelGroupProps): JSX.Element {
  const direction = props.direction ?? "horizontal";
  const sizes = signal<number[]>([]);
  const panels: HTMLElement[] = [];
  const wirings: (() => void)[] = [];

  // The group owns the layout: this effect mirrors the sizes signal onto each
  // panel's flex-grow whenever a resize writes it.
  effect(() => {
    const current = sizes();
    let i = 0;
    while (i < panels.length) {
      panels[i]!.style.flexGrow = String(current[i] ?? 0);
      i++;
    }
  });

  const bounds = (index: number): { min: number; max: number } => ({
    min: Number(panels[index]!.getAttribute("data-min-size") ?? 0),
    max: Number(panels[index]!.getAttribute("data-max-size") ?? 100),
  });

  // Moves the handle between panel `prevIndex` and its right/bottom neighbor by
  // `delta` percent of the group, clamped so both keep their min/max. `layout`
  // holds the sizes the delta applies to: the drag-start snapshot for pointer
  // moves (onDrag reports cumulative deltas), the live layout for keyboard steps.
  const resizePair = (layout: number[], prevIndex: number, delta: number): void => {
    const current = layout;
    const nextIndex = prevIndex + 1;
    if (prevIndex < 0 || nextIndex >= current.length) return;
    const prev = current[prevIndex]!;
    const next = current[nextIndex]!;
    const prevBounds = bounds(prevIndex);
    const nextBounds = bounds(nextIndex);
    const max = Math.min(prevBounds.max - prev, next - nextBounds.min);
    const min = Math.max(prevBounds.min - prev, next - nextBounds.max);
    const clamped = Math.min(max, Math.max(min, delta));
    if (!Number.isFinite(clamped) || clamped === 0) return;
    const updated = current.slice();
    updated[prevIndex] = prev + clamped;
    updated[nextIndex] = next - clamped;
    sizes(updated);
    props.onLayout?.(updated);
  };

  const wireHandle = (group: HTMLElement, handleEl: HTMLElement, prevIndex: number): void => {
    handleEl.setAttribute("aria-orientation", direction);
    if (handleEl.getAttribute("aria-disabled") === "true") return;
    let groupSize = 0;
    let startSizes: number[] | null = null;
    wirings.push(onDrag(handleEl, {
      onStart: () => {
        const rect = group.getBoundingClientRect();
        const size = direction === "horizontal" ? rect.width : rect.height;
        if (size <= 0) return;
        groupSize = size;
        startSizes = sizes().slice();
      },
      onMove: (delta) => {
        if (groupSize <= 0 || !startSizes) return;
        const px = direction === "horizontal" ? delta.dx : delta.dy;
        resizePair(startSizes, prevIndex, (px / groupSize) * 100);
      },
      onEnd: () => {
        groupSize = 0;
        startSizes = null;
      },
    }));
    const onKeydown = (event: Event): void => {
      const key = (event as KeyboardEvent).key;
      if (key !== "ArrowLeft" && key !== "ArrowRight" && key !== "ArrowUp" && key !== "ArrowDown") return;
      event.preventDefault();
      resizePair(sizes(), prevIndex, key === "ArrowRight" || key === "ArrowDown" ? 5 : -5);
    };
    handleEl.addEventListener("keydown", onKeydown);
    wirings.push(() => handleEl.removeEventListener("keydown", onKeydown));
  };

  return (
    <div
      data-slot="resizable-panel-group"
      aria-orientation={direction}
      class={
        cn("flex h-full w-full aria-[orientation=vertical]:flex-col", props.class)
      }
      hook:afterMount={(node) => {
        if (!(node instanceof HTMLElement)) return;
        const children = Array.from(node.children) as HTMLElement[];
        let panelCount = 0;
        let i = 0;
        while (i < children.length) {
          const child = children[i]!;
          if (child.getAttribute("data-slot") === "resizable-panel") {
            panels.push(child);
            panelCount++;
          } else if (child.getAttribute("data-slot") === "resizable-handle") {
            wireHandle(node, child, panelCount - 1);
          }
          i++;
        }
        const seeded: number[] = [];
        let p = 0;
        while (p < panels.length) {
          seeded.push(Number(panels[p]!.getAttribute("data-default-size") ?? 0));
          p++;
        }
        sizes(seeded);
      }}
      hook:beforeDestroy={() => {
        while (wirings.length) wirings.pop()!();
      }}
    >
      {() => props.children}
    </div>
  );
}

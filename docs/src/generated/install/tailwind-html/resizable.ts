import { html, onDrag } from "@hellajs/dom";
import { effect, signal } from "@hellajs/core";
import type { HTMLAttributes, HellaChildren, HellaNode } from "@hellajs/dom";
import { cn } from "./cn.js";

interface ResizablePanelGroupProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  direction?: "horizontal" | "vertical";
  /** Reports the panel sizes (percentages) after each drag or keyboard resize. The initial layout does not fire it. */
  onLayout?: (sizes: number[]) => void;
}

interface ResizablePanelProps extends HTMLAttributes<"div"> {
  class?: string;
  children?: HellaChildren;
  /** Initial share of the group, in percent. The group rewrites `flex-grow` as handles resize the pair. */
  defaultSize: number;
  minSize?: number;
  maxSize?: number;
}

interface ResizableHandleProps extends HTMLAttributes<"div"> {
  class?: string;
  withHandle?: boolean;
}

/** The grip visual (refs/icons/grip-vertical.svg), created per call so clones never share nodes. */
const gripIcon = (): HellaNode =>
  html`<svg
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
    class="${
      cn("size-2.5")
    }"
  >
    <circle cx="9" cy="5" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="9" cy="19" r="1" />
    <circle cx="15" cy="5" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="15" cy="19" r="1" />
  </svg>` as HellaNode;

export function ResizablePanel({ defaultSize, minSize, maxSize, children, class: cls, ...attrs }: ResizablePanelProps): HellaNode {
  const minSizeValue = minSize ?? 0;
  const maxSizeValue = maxSize ?? 100;
  return html`
    <div
      data-slot="resizable-panel"
      data-default-size="${defaultSize}"
      data-min-size="${minSizeValue}"
      data-max-size="${maxSizeValue}"
      style="${`flex: ${defaultSize} 1 0%`}"
      class="${cls}"
      ...${attrs}
    >${() => children}</div>
  ` as HellaNode;
}

export function ResizableHandle({ withHandle, disabled, class: cls, ...attrs }: ResizableHandleProps): HellaNode {
  return html`
    <div
      data-slot="resizable-handle"
      role="separator"
      tabindex="${disabled ? -1 : 0}"
      aria-orientation="horizontal"
      aria-disabled="${disabled ? "true" : undefined}"
      data-disabled="${disabled ? "true" : undefined}"
      class="${
        cn("relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:outline-hidden aria-[orientation=horizontal]:h-px aria-[orientation=horizontal]:w-full aria-[orientation=horizontal]:after:left-0 aria-[orientation=horizontal]:after:h-1 aria-[orientation=horizontal]:after:w-full aria-[orientation=horizontal]:after:translate-x-0 aria-[orientation=horizontal]:after:-translate-y-1/2 [&[aria-orientation=horizontal]>div]:rotate-90", cls)
      }"
      ...${attrs}
    >${() => withHandle && html`<div class="${
        cn("z-10 flex h-4 w-3 items-center justify-center rounded-xs border bg-border")
      }">${gripIcon()}</div>`}
    </div>
  ` as HellaNode;
}

export default function ResizablePanelGroup({ direction: directionProp, onLayout, children, class: cls, ...attrs }: ResizablePanelGroupProps): HellaNode {
  const direction = directionProp ?? "horizontal";
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
    onLayout?.(updated);
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

  return html`
    <div
      data-slot="resizable-panel-group"
      aria-orientation="${direction}"
      class="${
        cn("flex h-full w-full aria-[orientation=vertical]:flex-col", cls)
      }"
      hook:afterMount="${(node: Element) => {
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
      }}"
      hook:beforeDestroy="${() => {
        while (wirings.length) wirings.pop()!();
      }}"
      ...${attrs}
    >
      ${() => children}
    </div>
  ` as HellaNode;
}

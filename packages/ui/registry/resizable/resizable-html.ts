import { html, onDrag } from "@hellajs/dom";
import { effect, signal } from "@hellajs/core";
import type { HellaChildren, HellaNode } from "@hellajs/dom";

// @hella:styles
// @hella:end

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
      // @hella:compose
      [icon]
      // @hella:end
    }"
  ><circle cx="9" cy="5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="9" cy="19" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="15" cy="19" r="1" /></svg>` as HellaNode;

export function ResizablePanel(props: ResizablePanelProps): HellaNode {
  const minSize = props.minSize ?? 0;
  const maxSize = props.maxSize ?? 100;
  return html`
    <div
      data-slot="resizable-panel"
      data-default-size="${props.defaultSize}"
      data-min-size="${minSize}"
      data-max-size="${maxSize}"
      style="${`flex: ${props.defaultSize} 1 0%`}"
      class="${props.class}"
    >${() => props.children}</div>
  ` as HellaNode;
}

export function ResizableHandle(props: ResizableHandleProps): HellaNode {
  return html`
    <div
      data-slot="resizable-handle"
      role="separator"
      tabindex="${props.disabled ? -1 : 0}"
      aria-orientation="horizontal"
      aria-disabled="${props.disabled ? "true" : undefined}"
      data-disabled="${props.disabled ? "true" : undefined}"
      class="${
        // @hella:compose
        [handle, props.class]
        // @hella:end
      }"
    >${() => props.withHandle && html`<div class="${
        // @hella:compose
        [grip]
        // @hella:end
      }">${gripIcon()}</div>`}</div>
  ` as HellaNode;
}

export default function ResizablePanelGroup(props: ResizablePanelGroupProps): HellaNode {
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
  // `delta` percent of the group, clamped so both keep their min/max. `base` is
  // the layout the delta applies to: the drag-start snapshot for pointer moves
  // (onDrag reports cumulative deltas), the live layout for keyboard steps.
  const resizePair = (base: number[], prevIndex: number, delta: number): void => {
    const current = base;
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

  const wireHandle = (group: HTMLElement, handle: HTMLElement, prevIndex: number): void => {
    handle.setAttribute("aria-orientation", direction);
    if (handle.getAttribute("aria-disabled") === "true") return;
    let groupSize = 0;
    let startSizes: number[] | null = null;
    wirings.push(onDrag(handle, {
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
    handle.addEventListener("keydown", onKeydown);
    wirings.push(() => handle.removeEventListener("keydown", onKeydown));
  };

  return html`
    <div
      data-slot="resizable-panel-group"
      aria-orientation="${direction}"
      class="${
        // @hella:compose
        [base, props.class]
        // @hella:end
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
    >
      ${() => props.children}
    </div>
  ` as HellaNode;
}

import type { DragHandlers } from "./types/behaviors";

/**
 * Tracks a pointer drag on `el` and reports cumulative deltas — consumers own
 * all value math (thumb clamping, drawer swipe distance). A primary-button
 * `pointerdown` not on a `[disabled]` descendant starts the drag and captures
 * the pointer (guarded — environments without `setPointerCapture` skip it);
 * `pointermove` emits `{ dx, dy, event }` from the drag start; `pointerup`,
 * `pointercancel`, and `lostpointercapture` fire `onEnd` once.
 *
 * `touch-action: none` is the consumer's responsibility (style modules carry it).
 *
 * ```ts
 * const dispose = onDrag(thumb, { onMove: ({ dx }) => setValue(dx) });
 * ```
 * @param el Element receiving the pointer events.
 * @param handlers Move callback plus optional start/end hooks.
 * @returns Dispose handle — removes all five pointer listeners.
 * @throws {Error} When el, handlers, or handlers.onMove is null or undefined.
 */
export function onDrag(el: HTMLElement, handlers: DragHandlers): () => void {
  if (el == null) {
    throw new Error("[dom] onDrag: el is required");
  }
  if (handlers == null) {
    throw new Error("[dom] onDrag: handlers is required");
  }
  if (handlers.onMove == null) {
    throw new Error("[dom] onDrag: onMove is required");
  }
  let startX = 0;
  let startY = 0;
  let active = false;
  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const hit = event.target as HTMLElement | null;
    if (hit != null && hit.closest != null && hit.closest("[disabled]") != null) return;
    active = true;
    startX = event.clientX;
    startY = event.clientY;
    el.setPointerCapture?.(event.pointerId);
    handlers.onStart?.(event);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (!active) return;
    handlers.onMove({ dx: event.clientX - startX, dy: event.clientY - startY, event });
  };
  const onDragEnd = (): void => {
    if (!active) return;
    active = false;
    handlers.onEnd?.();
  };
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", onDragEnd);
  el.addEventListener("pointercancel", onDragEnd);
  el.addEventListener("lostpointercapture", onDragEnd);
  return () => {
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", onDragEnd);
    el.removeEventListener("pointercancel", onDragEnd);
    el.removeEventListener("lostpointercapture", onDragEnd);
  };
}

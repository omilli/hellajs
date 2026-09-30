import type { PinchHandlers } from "./types/behaviors";

/**
 * Tracks a two-pointer pinch on `el` and reports scale and centroid deltas —
 * consumers own all transform math (image zoom, map pan). A primary-button
 * `pointerdown` not on a `[disabled]` descendant joins the tracked pair (the
 * first two pointers win, a third is ignored); when the second pointer lands
 * the gesture starts and the baseline is the pair's distance and centroid.
 * Moves of either tracked pointer report `scale` (current distance over
 * baseline distance) and `dx`/`dy` (centroid offset from the baseline
 * centroid); when either tracked pointer ends, `onEnd` fires once and state
 * resets — a fresh second pointer starts a new gesture with a fresh baseline.
 *
 * `touch-action: none` is the consumer's responsibility (style modules carry it).
 *
 * ```ts
 * const dispose = onPinch(image, {
 *   onMove: ({ scale, dx, dy }) =>
 *     (image.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`),
 *   onEnd: () => clampOrReset(),
 * });
 * ```
 * @param el Element receiving the pointer events.
 * @param handlers Move callback plus optional start/end hooks.
 * @returns Dispose handle — removes all five pointer listeners.
 * @throws {Error} When el, handlers, or handlers.onMove is null or undefined.
 */
export function onPinch(el: HTMLElement, handlers: PinchHandlers): () => void {
  if (el == null) {
    throw new Error("[dom] onPinch: el is required");
  }
  if (handlers == null) {
    throw new Error("[dom] onPinch: handlers is required");
  }
  if (handlers.onMove == null) {
    throw new Error("[dom] onPinch: onMove is required");
  }
  const pointers = new Map<number, { x: number; y: number }>();
  let baselineDistance = 0;
  let baseX = 0;
  let baseY = 0;
  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const hit = event.target as HTMLElement | null;
    if (hit != null && hit.closest != null && hit.closest("[disabled]") != null) return;
    if (pointers.size >= 2) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    el.setPointerCapture?.(event.pointerId);
    const [first, second] = pointers.values();
    if (first == null || second == null) return;
    baselineDistance = Math.hypot(second.x - first.x, second.y - first.y);
    baseX = (first.x + second.x) / 2;
    baseY = (first.y + second.y) / 2;
    handlers.onStart?.(event);
  };
  const onPointerMove = (event: PointerEvent): void => {
    const pos = pointers.get(event.pointerId);
    if (pos == null) return;
    pos.x = event.clientX;
    pos.y = event.clientY;
    const [first, second] = pointers.values();
    if (first == null || second == null) return;
    handlers.onMove({
      scale: Math.hypot(second.x - first.x, second.y - first.y) / baselineDistance,
      dx: (first.x + second.x) / 2 - baseX,
      dy: (first.y + second.y) / 2 - baseY
    });
  };
  const onPointerEnd = (event: PointerEvent): void => {
    if (!pointers.delete(event.pointerId)) return;
    if (pointers.size !== 1) return;
    handlers.onEnd?.();
  };
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", onPointerEnd);
  el.addEventListener("pointercancel", onPointerEnd);
  el.addEventListener("lostpointercapture", onPointerEnd);
  return () => {
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", onPointerEnd);
    el.removeEventListener("pointercancel", onPointerEnd);
    el.removeEventListener("lostpointercapture", onPointerEnd);
  };
}

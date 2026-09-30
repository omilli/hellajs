import type { DoubleTapOptions } from "./types/behaviors";

/**
 * Fires `onDoubleTap` when a second tap lands within `interval` of the first on
 * `el`. A tap is a primary-button `pointerdown` not on a `[disabled]`
 * descendant whose `pointerup` stays within 8px of the press point; drift
 * beyond that or `pointercancel` voids the tap. When no second tap arrives and
 * `onSingleTap` is provided, it fires once with the first tap's event — singles
 * never pay the delay unless the consumer opts in.
 *
 * ```ts
 * const dispose = onDoubleTap(image, {
 *   onDoubleTap: (event) => toggleZoom(event),
 *   onSingleTap: (event) => selectAt(event),
 * });
 * ```
 * @param el Element receiving the pointer events.
 * @param options Double-tap callback, opt-in single-tap callback, and interval.
 * @returns Dispose handle — removes the pointer listeners and clears a pending timer.
 * @throws {Error} When el, options, or options.onDoubleTap is null or undefined.
 */
export function onDoubleTap(el: HTMLElement, options: DoubleTapOptions): () => void {
  if (el == null) {
    throw new Error("[dom] onDoubleTap: el is required");
  }
  if (options == null) {
    throw new Error("[dom] onDoubleTap: options is required");
  }
  if (options.onDoubleTap == null) {
    throw new Error("[dom] onDoubleTap: onDoubleTap is required");
  }
  const interval = options.interval ?? 250;
  const tolerance = 8;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let active = false;
  let startX = 0;
  let startY = 0;
  const cancel = (): void => {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  };
  const onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const hit = event.target as HTMLElement | null;
    if (hit != null && hit.closest != null && hit.closest("[disabled]") != null) return;
    active = true;
    startX = event.clientX;
    startY = event.clientY;
  };
  const onPointerUp = (event: PointerEvent): void => {
    if (!active) return;
    active = false;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (dx * dx + dy * dy > tolerance * tolerance) return;
    if (timer !== null) {
      cancel();
      options.onDoubleTap(event);
    } else {
      timer = setTimeout(() => {
        timer = null;
        options.onSingleTap?.(event);
      }, interval);
    }
  };
  const onPointerCancel = (): void => {
    active = false;
  };
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointerup", onPointerUp);
  el.addEventListener("pointercancel", onPointerCancel);
  return () => {
    cancel();
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointerup", onPointerUp);
    el.removeEventListener("pointercancel", onPointerCancel);
  };
}

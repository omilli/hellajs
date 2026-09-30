import type { LongPressOptions } from "./types/behaviors";

/**
 * Fires `handler` after a timed press on `el`. A primary-button `pointerdown`
 * not on a `[disabled]` descendant starts a `setTimeout(duration)`; a
 * `pointermove` beyond `tolerance` px from the press point, `pointerup`, or
 * `pointercancel` before expiry clears the timer; on expiry `handler` fires
 * once with the originating `pointerdown` event. CSS `:active` keeps ownership
 * of immediate press feedback; this wiring covers only the hold.
 *
 * ```ts
 * const dispose = onLongPress(tile, (event) => openContextMenu(event), { duration: 400 });
 * ```
 * @param el Element receiving the pointer events.
 * @param handler Fired once when the press outlives `duration`.
 * @param options Hold time in ms (default 500) and drift tolerance in px (default 8).
 * @returns Dispose handle — removes the pointer listeners and clears a pending timer.
 * @throws {Error} When el or handler is null or undefined.
 */
export function onLongPress(
  el: HTMLElement,
  handler: (event: PointerEvent) => void,
  options?: LongPressOptions
): () => void {
  if (el == null) {
    throw new Error("[dom] onLongPress: el is required");
  }
  if (handler == null) {
    throw new Error("[dom] onLongPress: handler is required");
  }
  const duration = options?.duration ?? 500;
  const tolerance = options?.tolerance ?? 8;
  let timer: ReturnType<typeof setTimeout> | null = null;
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
    cancel();
    startX = event.clientX;
    startY = event.clientY;
    timer = setTimeout(() => {
      timer = null;
      handler(event);
    }, duration);
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (timer === null) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    if (dx * dx + dy * dy > tolerance * tolerance) cancel();
  };
  el.addEventListener("pointerdown", onPointerDown);
  el.addEventListener("pointermove", onPointerMove);
  el.addEventListener("pointerup", cancel);
  el.addEventListener("pointercancel", cancel);
  return () => {
    cancel();
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", cancel);
    el.removeEventListener("pointercancel", cancel);
  };
}

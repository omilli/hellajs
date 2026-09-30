import { onDrag } from "./onDrag";
import type { SwipeCommit, SwipeHandlers, SwipeOptions, SwipeState } from "./types/behaviors";

/** Move samples older than this many ms leave the velocity window. */
const VELOCITY_WINDOW = 100;

/**
 * Tracks a pointer swipe on `el` and commits or cancels on release by distance
 * and velocity. Composes `onDrag`, inheriting its primary-button + `[disabled]`
 * guards and guarded pointer capture; each move reports cumulative deltas. On
 * release the dominant axis (larger of `|dx|`, `|dy|`) commits when it traveled
 * at least `threshold` px or its release velocity reached the `velocity` floor;
 * any other release cancels.
 *
 * `touch-action: none` is the consumer's responsibility (onDrag contract).
 *
 * ```ts
 * const dispose = onSwipe(drawer, {
 *   onMove: ({ dx }) => setTranslate(dx),
 *   onCommit: ({ direction }) => { if (direction === "left") close(); },
 *   onCancel: () => snapBack(),
 * });
 * ```
 * @param el Element receiving the pointer events.
 * @param handlers Move callback plus optional start/commit/cancel hooks.
 * @param options Distance threshold in px (default 50) and release velocity floor in px/ms (default 0.5).
 * @returns Dispose handle — removes all five pointer listeners.
 * @throws {Error} When el, handlers, or handlers.onMove is null or undefined.
 */
export function onSwipe(
  el: HTMLElement,
  handlers: SwipeHandlers,
  options?: SwipeOptions
): () => void {
  if (el == null) {
    throw new Error("[dom] onSwipe: el is required");
  }
  if (handlers == null) {
    throw new Error("[dom] onSwipe: handlers is required");
  }
  if (handlers.onMove == null) {
    throw new Error("[dom] onSwipe: onMove is required");
  }
  const threshold = options?.threshold ?? 50;
  const velocityFloor = options?.velocity ?? 0.5;
  let startX = 0;
  let startY = 0;
  const first = { x: 0, y: 0, t: 0 };
  const last = { x: 0, y: 0, t: 0 };
  const onStart = (event: PointerEvent): void => {
    const t = performance.now();
    startX = event.clientX;
    startY = event.clientY;
    first.x = startX;
    first.y = startY;
    first.t = t;
    last.x = startX;
    last.y = startY;
    last.t = t;
    handlers.onStart?.(event);
  };
  const onMove = (state: SwipeState): void => {
    const t = performance.now();
    if (t - first.t > VELOCITY_WINDOW) {
      first.x = last.x;
      first.y = last.y;
      first.t = last.t;
    }
    last.x = state.event.clientX;
    last.y = state.event.clientY;
    last.t = t;
    handlers.onMove(state);
  };
  const onEnd = (): void => {
    const dx = last.x - startX;
    const dy = last.y - startY;
    const dt = last.t - first.t;
    const vx = (last.x - first.x) / (dt > 0 ? dt : 1);
    const vy = (last.y - first.y) / (dt > 0 ? dt : 1);
    const isHorizontal = Math.abs(dx) >= Math.abs(dy);
    const distance = isHorizontal ? Math.abs(dx) : Math.abs(dy);
    const speed = isHorizontal ? Math.abs(vx) : Math.abs(vy);
    if (distance < threshold && speed < velocityFloor) {
      handlers.onCancel?.();
      return;
    }
    let direction: SwipeCommit["direction"];
    if (isHorizontal) {
      direction = dx >= 0 ? "right" : "left";
    } else {
      direction = dy >= 0 ? "down" : "up";
    }
    handlers.onCommit?.({ direction, dx, dy });
  };
  return onDrag(el, { onStart, onMove, onEnd });
}

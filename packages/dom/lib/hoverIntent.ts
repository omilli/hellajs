import type { HoverIntentOptions } from "./types/behaviors";

const SKIP_DELAY_DURATION = 500;

let lastOpenedAt = -Infinity;

/**
 * Opens after a pointer/focus hover delay and closes after a leave delay —
 * the tooltip/hover-card timing contract. `pointerenter` starts the open
 * timer; `pointerleave` cancels it (or schedules the close); a pointerdown
 * outside the target closes immediately. `focus`/`blur` share the same path
 * for keyboard parity.
 *
 * Shares a module-level skip-delay window: an open within the previous 500ms
 * makes the next `onOpen` fire instantly, so moving between adjacent
 * triggers never re-incurs the delay (Radix tooltip semantics — shared across
 * all consumers, which is why it lives here and not per-component).
 *
 * ```ts
 * const dispose = hoverIntent(trigger, { onOpen: show, onClose: hide });
 * ```
 * @param target Element watched for hover/focus intent.
 * @param handlers Open/close callbacks and their delays.
 * @returns Dispose handle — removes all listeners and clears pending timers.
 * @throws {Error} When target or handlers is null or undefined.
 */
export function hoverIntent(target: Element, handlers: HoverIntentOptions): () => void {
  if (target == null) {
    throw new Error("[dom] hoverIntent: target is required");
  }
  if (handlers == null) {
    throw new Error("[dom] hoverIntent: handlers is required");
  }
  const openDelay = handlers.openDelay ?? 700;
  const closeDelay = handlers.closeDelay ?? 300;
  let openTimer: ReturnType<typeof setTimeout> | null = null;
  let closeTimer: ReturnType<typeof setTimeout> | null = null;
  let isOpen = false;

  const clearOpen = (): void => {
    if (openTimer !== null) {
      clearTimeout(openTimer);
      openTimer = null;
    }
  };
  const clearClose = (): void => {
    if (closeTimer !== null) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  };
  const open = (): void => {
    clearClose();
    isOpen = true;
    lastOpenedAt = Date.now();
    handlers.onOpen();
  };
  const close = (): void => {
    isOpen = false;
    handlers.onClose();
  };
  const enter = (): void => {
    clearClose();
    if (isOpen) return;
    if (Date.now() - lastOpenedAt < SKIP_DELAY_DURATION) {
      open();
      return;
    }
    clearOpen();
    openTimer = setTimeout(open, openDelay);
  };
  const leave = (): void => {
    clearOpen();
    if (!isOpen) return;
    clearClose();
    closeTimer = setTimeout(close, closeDelay);
  };
  const onDocumentPointerDown = (event: PointerEvent): void => {
    if (target.contains(event.target as Node | null)) return;
    clearOpen();
    clearClose();
    if (isOpen) close();
  };

  target.addEventListener("pointerenter", enter);
  target.addEventListener("pointerleave", leave);
  target.addEventListener("focus", enter);
  target.addEventListener("blur", leave);
  document.addEventListener("pointerdown", onDocumentPointerDown, true);
  return () => {
    clearOpen();
    clearClose();
    target.removeEventListener("pointerenter", enter);
    target.removeEventListener("pointerleave", leave);
    target.removeEventListener("focus", enter);
    target.removeEventListener("blur", leave);
    document.removeEventListener("pointerdown", onDocumentPointerDown, true);
  };
}

/**
 * Resets the shared skip-delay clock — test isolation only.
 * @internal
 */
export function resetHoverIntentState(): void {
  lastOpenedAt = -Infinity;
}

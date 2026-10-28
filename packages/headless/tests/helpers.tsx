/**
 * Dispatches a bubbling pointerdown at `target`.
 */
export function pointerDown(target: Node): void {
  target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
}

/** Dispatches a non-bubbling pointerenter at `target` (enter/leave never bubble). */
export function pointerEnter(target: Node): void {
  target.dispatchEvent(new PointerEvent("pointerenter"));
}

/** Dispatches a non-bubbling pointerleave at `target`. */
export function pointerLeave(target: Node): void {
  target.dispatchEvent(new PointerEvent("pointerleave"));
}

/** Dispatches a bubbling pointermove at `target` with client coordinates. */
export function pointerMove(target: Node, x = 0, y = 0): void {
  target.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: x, clientY: y }));
}

/** Dispatches a bubbling pointerup at `target`. */
export function pointerUp(target: Node): void {
  target.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }));
}

/** Dispatches a bubbling pointercancel at `target`. */
export function pointerCancel(target: Node): void {
  target.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true }));
}

/**
 * Creates a container with one button per label, appended to the document body —
 * the standard focusable group for trap and roving scenarios.
 */
export function setupButtons(labels: string[]): {
  container: HTMLDivElement;
  buttons: HTMLButtonElement[];
} {
  const container = document.createElement("div");
  const buttons = labels.map((label) => {
    const button = document.createElement("button");
    button.textContent = label;
    return button;
  });
  container.append(...buttons);
  document.body.append(container);
  return { container, buttons };
}

/**
 * Dispatches a bubbling keydown at `target`; returns the event so tests can
 * assert `defaultPrevented`.
 */
export function pressKey(target: Node, key: string, shiftKey = false): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true, shiftKey });
  target.dispatchEvent(event);
  return event;
}

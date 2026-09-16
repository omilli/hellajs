/**
 * Creates a container with one button per label, appended to the document body —
 * the standard focusable group for trap and roving scenarios.
 */
export function setupButtons(labels: string[]): { container: HTMLDivElement; buttons: HTMLButtonElement[] } {
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

/**
 * Dispatches a bubbling pointerdown at `target`.
 */
export function pointerDown(target: Node): void {
  target.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
}

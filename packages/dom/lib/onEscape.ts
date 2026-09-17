/**
 * Calls `handler` when an Escape keydown fires on `target`. The keyed wrapper
 * copy/paste components need — one line to wire, one dispose handle to clean up.
 *
 * ```ts
 * const dismiss = onEscape(panel, () => close());
 * ```
 * @param target Node or window receiving the keydown.
 * @param handler Zero-argument callback fired on Escape.
 * @returns Dispose handle — removes the keydown listener.
 * @throws {Error} When target or handler is null or undefined.
 */
export function onEscape(target: Node | Window, handler: () => void): () => void {
  if (target == null) {
    throw new Error("[dom] onEscape: target is required");
  }
  if (handler == null) {
    throw new Error("[dom] onEscape: handler is required");
  }
  const onKeyDown = (event: Event): void => {
    if ((event as KeyboardEvent).key === "Escape") handler();
  };
  target.addEventListener("keydown", onKeyDown);
  return () => {
    target.removeEventListener("keydown", onKeyDown);
  };
}

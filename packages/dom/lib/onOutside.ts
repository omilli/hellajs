/**
 * Calls `handler` when a document pointerdown lands outside every node `targets`
 * resolves. `targets` is a getter re-invoked per event, so portal and dynamic
 * content re-resolves without rewiring.
 *
 * ```ts
 * const dismiss = onOutside(() => [panel(), dialogRef], () => close());
 * ```
 * @param targets Getter returning the nodes counted as inside; null entries ignored.
 * @param handler Zero-argument callback fired on outside pointerdown.
 * @returns Dispose handle — removes the document pointerdown listener.
 * @throws {Error} When targets or handler is null or undefined.
 */
export function onOutside(targets: () => (Node | null)[], handler: () => void): () => void {
  if (targets == null) {
    throw new Error("[dom] onOutside: targets is required");
  }
  if (handler == null) {
    throw new Error("[dom] onOutside: handler is required");
  }
  const onPointerDown = (event: PointerEvent): void => {
    const nodes = targets();
    let i = 0;
    const len = nodes.length;
    while (i < len) {
      const node = nodes[i];
      if (node != null && node.contains(event.target as Node | null)) return;
      i++;
    }
    handler();
  };
  document.addEventListener("pointerdown", onPointerDown, true);
  return () => {
    document.removeEventListener("pointerdown", onPointerDown, true);
  };
}

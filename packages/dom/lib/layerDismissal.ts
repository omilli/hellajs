interface LayerEntry {
  nodes: () => (Node | null)[];
  onDismiss: () => void;
}

const layerStack: LayerEntry[] = [];

const isTopLayer = (entry: LayerEntry): boolean => layerStack[layerStack.length - 1] === entry;

/**
 * Dismisses stacked overlays one layer at a time — Escape (document, capture)
 * and a pointerdown outside every `nodes()` entry fire `onDismiss` only when
 * this layer is top of the shared stack. Submenus over menus over popovers
 * each get their own `layerDismissal` wiring; the top layer absorbs the first
 * dismissal. The `nodes` getter re-invokes per event, so portal content
 * re-resolves without rewiring. `onDismiss` must dispose the layer (the
 * dismissal does not pop the stack itself).
 *
 * Existing `onEscape`/`onOutside` stay untouched — dialog keeps its wiring.
 *
 * ```ts
 * const dispose = layerDismissal(() => [panelRef.current], () => close());
 * ```
 * @param nodes Getter returning the nodes counted as inside; null entries ignored.
 * @param onDismiss Zero-argument callback fired when the top layer is dismissed.
 * @returns Dispose handle — pops the stack and removes both document listeners.
 * @throws {Error} When nodes or onDismiss is null or undefined.
 */
export function layerDismissal(nodes: () => (Node | null)[], onDismiss: () => void): () => void {
  if (nodes == null) {
    throw new Error("[dom] layerDismissal: nodes is required");
  }
  if (onDismiss == null) {
    throw new Error("[dom] layerDismissal: onDismiss is required");
  }
  const entry: LayerEntry = { nodes, onDismiss };
  const onKeyDown = (event: Event): void => {
    if ((event as KeyboardEvent).key !== "Escape" || !isTopLayer(entry)) return;
    onDismiss();
  };
  const onPointerDown = (event: PointerEvent): void => {
    if (!isTopLayer(entry)) return;
    const current = nodes();
    let i = 0;
    const len = current.length;
    while (i < len) {
      const node = current[i];
      if (node != null && node.contains(event.target as Node | null)) return;
      i++;
    }
    onDismiss();
  };
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("pointerdown", onPointerDown, true);
  layerStack.push(entry);
  return () => {
    const at = layerStack.indexOf(entry);
    if (at !== -1) layerStack.splice(at, 1);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("pointerdown", onPointerDown, true);
  };
}

/**
 * Clears the shared layer stack — test isolation only.
 * @internal
 */
export function resetLayerStack(): void {
  layerStack.length = 0;
}

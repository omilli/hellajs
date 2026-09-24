/**
 * Wireable typeahead search for menu items — printable keystrokes buffer into
 * a query (auto-reset after 500ms) and the first matching item is selected.
 * Matching is case-insensitive: `startsWith` wins first; when nothing starts
 * with the query, a substring match scans from the item after the last
 * selection and wraps around. Keys with ctrl/meta/alt modifiers and
 * non-printable keys (arrows, Enter, Escape) never touch the buffer.
 *
 * ```ts
 * const dispose = menuTypeahead(menu, collectItems, item => item.node.focus());
 * ```
 * @param container Element receiving the menu's keydown events.
 * @param resolveItems Getter returning the current searchable items, re-invoked per keystroke so dynamic menus stay live.
 * @param onSelect Called with the first matching item.
 * @returns Dispose handle — removes the keydown listener and clears the buffer timer.
 * @throws {Error} When container, resolveItems, or onSelect is null or undefined.
 */
export function menuTypeahead(
  container: ParentNode,
  resolveItems: () => { node: HTMLElement; text: string }[],
  onSelect: (item: { node: HTMLElement; text: string }) => void
): () => void {
  if (container == null) {
    throw new Error("[dom] menuTypeahead: container is required");
  }
  if (resolveItems == null) {
    throw new Error("[dom] menuTypeahead: resolveItems is required");
  }
  if (onSelect == null) {
    throw new Error("[dom] menuTypeahead: onSelect is required");
  }
  let buffer = "";
  let bufferTimer: ReturnType<typeof setTimeout> | null = null;
  let lastIndex = -1;
  const onKeyDown = (event: Event): void => {
    const e = event as KeyboardEvent;
    if (e.ctrlKey || e.metaKey || e.altKey || e.key.length !== 1) return;
    if (bufferTimer !== null) clearTimeout(bufferTimer);
    buffer += e.key;
    bufferTimer = setTimeout(() => {
      buffer = "";
      bufferTimer = null;
    }, 500);
    const items = resolveItems();
    const len = items.length;
    if (len === 0) return;
    const search = buffer.toLowerCase();
    let match = -1;
    let s = 0;
    while (s < len) {
      if (items[s]!.text.toLowerCase().startsWith(search)) {
        match = s;
        break;
      }
      s++;
    }
    if (match === -1) {
      let w = 0;
      while (w < len) {
        const idx = (lastIndex + 1 + w) % len;
        if (items[idx]!.text.toLowerCase().includes(search)) {
          match = idx;
          break;
        }
        w++;
      }
    }
    if (match === -1) return;
    lastIndex = match;
    onSelect(items[match]!);
  };
  container.addEventListener("keydown", onKeyDown);
  return () => {
    container.removeEventListener("keydown", onKeyDown);
    if (bufferTimer !== null) clearTimeout(bufferTimer);
  };
}

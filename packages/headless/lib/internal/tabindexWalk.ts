/**
 * Lands the selection's tabindex across the roving items: `0` on the matched
 * item, `-1` on the rest. A `matched` of `-1` (no selection) lands the first
 * item — both wirings (tabs, radioGroup) fall back to index 0 when the
 * selection matches nothing. The selection-landing step shared by the tabs
 * and press engines; `rovingTabIndex`'s container-scoped init walk serves a
 * different contract and keeps its own.
 * @internal
 * @param items The roving items in DOM order.
 * @param matched The matched item's index, or `-1` to land the first item.
 */
export function landTabindex(items: HTMLElement[], matched: number): void {
  const active = matched === -1 ? 0 : matched;
  let w = 0;
  const len = items.length;
  while (w < len) {
    items[w]!.tabIndex = w === active ? 0 : -1;
    w++;
  }
}

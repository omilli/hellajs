import { getFocusables } from "./internal/focusables";
import type { TrapFocusOptions } from "./types/behaviors";

/**
 * Traps Tab navigation inside `container`: Tab from the last focusable child wraps
 * to the first and Shift+Tab from the first wraps to the last, until the returned
 * dispose handle is called.
 *
 * ```ts
 * const release = trapFocus(panel); // … later:
 * release();
 * ```
 * @param container Element whose focusable descendants form the trap.
 * @param options `initialFocus` override and `restoreFocus` control.
 * @returns Dispose handle — removes the trap; restores the pre-trap `activeElement` unless `restoreFocus: false`.
 * @throws {Error} When container is null or undefined.
 */
export function trapFocus(container: ParentNode, options?: TrapFocusOptions): () => void {
  if (container == null) {
    throw new Error("[dom] trapFocus: container is required");
  }
  const restoreFocus = options?.restoreFocus !== false;
  const previous = restoreFocus ? (document.activeElement as HTMLElement | null) : null;
  const focusInitial = options?.initialFocus;
  const initial = focusInitial == null ? getFocusables(container)[0] : focusInitial();
  initial?.focus();
  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Tab") return;
    const focusables = getFocusables(container);
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      }
    } else if (document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  document.addEventListener("keydown", onKeyDown, true);
  return () => {
    document.removeEventListener("keydown", onKeyDown, true);
    previous?.focus();
  };
}

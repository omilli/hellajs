import { registry } from "@hellajs/dom";
import { onEscape } from "./onEscape";
import { onOutside } from "./onOutside";
import { trapFocus } from "./trapFocus";
import type { ModalOptions } from "./types/foundations";

/**
 * Arms a modal panel: focus trap, Escape and outside dismissal, and the
 * exit-notify hook the dialog family unmounts through. Unlike the dispose-handle
 * behaviors, wiring is owned by the node — the arms re-arm with the `state`
 * getter (armed while `"open"`, disarmed while `"closed"`), and everything
 * disposes automatically when the node leaves the DOM. No cleanup arrays.
 *
 * ```ts
 * // inside hook:afterMount, where node is the panel element
 * modal(node, {
 *   state, // () => "open" | "closed"
 *   onClose: () => open(false),
 *   onExited: () => unmount(),
 * });
 * ```
 * @param node The panel element the wiring arms against.
 * @param options `state` getter plus optional `onClose`, `escape`, `outside`, `onExited`.
 * @throws {Error} When node or state is null or undefined.
 */
export function modal(node: HTMLElement, options: ModalOptions): void {
  if (node == null) {
    throw new Error("[headless] modal: node is required");
  }
  const state = options?.state;
  if (state == null) {
    throw new Error("[headless] modal: state is required");
  }
  const onClose = options.onClose;
  const escape = options.escape !== false;
  const outside = options.outside !== false;
  const onExited = options.onExited;

  // The re-armable arms live in one node-registered effect, held in a closure
  // the body disarms at its start — flipping to "closed" tears the
  // trap/escape/outside handlers down immediately, flipping back to "open"
  // re-arms, and node removal stops the effect so nothing re-arms. (The
  // registry's effect bodies return void — cleanup capture is not available,
  // so the arms ride the closure, not a cleanup return.)
  const armed: (() => void)[] = [];
  registry.addEffect(node, () => {
    while (armed.length) armed.pop()!();
    if (state() === "closed") return;
    if (escape && onClose) armed.push(onEscape(node, onClose));
    if (outside && onClose) armed.push(onOutside(() => [node], onClose));
    armed.push(trapFocus(node));
  });

  // The exit-notify listener ties to the node, NOT to state: installed once,
  // never removed on the close-flip disarm (that would kill onExited before
  // the exit animation ends) — removed only at node disposal. animationend
  // is unfiltered (bubbled child animations count, matching the dialog
  // templates); transitionend is filtered to the node's own transform (the
  // drawer's exit channel — child property transitions must stay inert).
  if (onExited) {
    const onExitEnd = (event: Event): void => {
      if (state() !== "closed") return;
      if (event.type === "transitionend") {
        if (event.target === node && (event as TransitionEvent).propertyName === "transform") {
          onExited();
        }
      } else {
        onExited();
      }
    };
    node.addEventListener("animationend", onExitEnd);
    node.addEventListener("transitionend", onExitEnd);
    registry.addHook(node, "beforeDestroy", () => {
      node.removeEventListener("animationend", onExitEnd);
      node.removeEventListener("transitionend", onExitEnd);
    });
  }

  // Node removal disposes whatever is armed — the document-level listeners
  // must not outlive the panel.
  registry.addHook(node, "beforeDestroy", () => {
    while (armed.length) armed.pop()!();
  });
}

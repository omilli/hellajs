import { expect } from "bun:test";
import { delay } from "@utils/test-helpers.js";
import { peekState } from "@hellajs/dom";

/**
 * Shared mount-poll helpers for the anchored-overlay components (tooltip,
 * hover-card, popover): portal content inserts into document.body, so the
 * usual container-firstChild resolvers do not apply and the mount walk is
 * observer-delivered.
 */

/** The newest portaled overlay node with the given data-slot - portals append to body, so the freshest sorts last. */
export function newestPortaled(slot: string): HTMLElement | undefined {
  const nodes = document.querySelectorAll(`[data-slot="${slot}"]`);
  return nodes.length === 0 ? undefined : (nodes[nodes.length - 1] as HTMLElement);
}

/** Polls (microtask hops) until the newest portaled node of the slot has finished the observer-driven mount walk. */
export async function awaitPortaled(slot: string): Promise<HTMLElement> {
  for (let i = 0; i < 50; i++) {
    const node = newestPortaled(slot);
    if (node !== undefined && peekState(node)?.isMounted) return node;
    await delay();
  }
  throw new Error(`portaled "${slot}" never mounted`);
}

/** Polls (microtask hops) until the node detaches from the document (the exit's unmount is observer-driven). */
export async function awaitDetached(node: Element): Promise<void> {
  for (let i = 0; i < 50; i++) {
    if (!node.isConnected) return;
    await delay();
  }
  expect(node.isConnected).toBe(false);
}

/** Pins an anchor rect on the element - the injectable seam the positioning assertions read through anchorPosition. */
export function pinRect(el: Element, top: number, left: number, width: number, height: number): void {
  el.getBoundingClientRect = () =>
    ({ top, left, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;
}

/** Dispatches a non-bubbling pointerenter at `target` (enter/leave never bubble). */
export function pointerEnter(target: Node): void {
  target.dispatchEvent(new PointerEvent("pointerenter"));
}

/** Dispatches a non-bubbling pointerleave at `target`. */
export function pointerLeave(target: Node): void {
  target.dispatchEvent(new PointerEvent("pointerleave"));
}

/** Dispatches a bubbling pointerdown on document.body - outside every anchored overlay's nodes. */
export function pointerDownOutside(): void {
  document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, cancelable: true }));
}

/** Dispatches a bubbling Escape keydown on document.body. */
export function pressEscape(): void {
  document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
}

/** Dispatches a bubbling, cancelable keydown at `target` (the menu keyboard model reads it there). */
export function pressKey(target: Element, key: string): void {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

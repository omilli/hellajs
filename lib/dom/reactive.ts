import type { ReactiveElement, Signal } from "../types";
import { handleProps } from "./props";

// Batch updates to reduce layout thrashing
const pendingUpdates = new Map<HTMLElement, Map<string, unknown>>();
let updateScheduled = false;

/**
 * Sets up a signal to update an element property/attribute when the signal value changes
 * 
 * @param element - Element to update
 * @param sig - Signal to track
 * @param key - Property/attribute name to update
 */
export function setupSignal(element: ReactiveElement, sig: Signal<unknown>, key: string): void {
  // Initial value
  handleProps(element, key, sig() as string);

  // Subscribe to changes with immediate DOM update (critical for reactivity)
  const cleanup = sig.subscribe((value) => {
    // Fast path for certain common properties
    if (key === 'textContent') {
      element.textContent = value as string;
      return;
    }

    if (key === 'class' || key === 'className') {
      element.className = value as string || '';
      return;
    }

    // Batch all other updates
    if (!pendingUpdates.has(element)) {
      pendingUpdates.set(element, new Map());
    }

    pendingUpdates.get(element)!.set(key, value);

    if (!updateScheduled) {
      updateScheduled = true;
      queueMicrotask(() => {
        updateScheduled = false;

        // Apply all pending updates
        for (const [element, updates] of pendingUpdates) {
          if (!element.isConnected) {
            pendingUpdates.delete(element);
            continue;
          }

          for (const [key, value] of updates) {
            handleProps(element, key, value as string);
          }

          updates.clear();
        }
      });
    }
  });


  // Store cleanup function
  if (!element._cleanups) {
    element._cleanups = [];
  }
  element._cleanups.push(cleanup);
}
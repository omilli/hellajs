import type { Signal } from "../types";
import { handleProps } from "./element";

// Type-safe tracking of reactive DOM elements and their signal dependencies
type ReactiveDom = WeakMap<HTMLElement, WeakMap<Signal<unknown>, Set<string>>>;
const reactiveDom: ReactiveDom = new WeakMap();

/**
 * Sets up a signal to update an element property/attribute when the signal value changes
 * 
 * @param element - Element to update
 * @param sig - Signal to track
 * @param key - Property/attribute name to update
 */
export function setupSignal(element: HTMLElement, sig: Signal<unknown>, key: string): void {
  const elementMap = reactiveDom.get(element) || new WeakMap();
  const signalSet = elementMap.get(sig) || new Set<string>();
  signalSet.add(key);
  elementMap.set(sig, signalSet);
  reactiveDom.set(element, elementMap);

  const setValue = (value: unknown): void => {
    handleProps(element, key, value);
  };

  setValue(sig());
  sig.subscribe(setValue);
}
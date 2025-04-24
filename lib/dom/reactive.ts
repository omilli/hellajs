import type { Signal } from "../types";
import { PROP_MAP, setElementProperty } from "./element";

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

  const attrName = PROP_MAP[key] || key;
  const isDataAttr = key.startsWith("data-");
  const dataKey = isDataAttr ? key.slice(5) : null;

  const setValue = (value: unknown): void => {
    if (isDataAttr && dataKey) {
      element.dataset[dataKey] = String(value);
    } else if (attrName !== key) {
      element.setAttribute(attrName, String(value));
    } else {
      try {
        setElementProperty(element, key, value);
      } catch {
        element.setAttribute(key, String(value));
      }
    }
  };

  setValue(sig());
  sig.subscribe(setValue);
}
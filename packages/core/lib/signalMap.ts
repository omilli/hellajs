import { signal } from "./signal";
import { computed } from "./computed";
import { createHooks, createVersion, writeValue } from "./internal/collections";
import type { Signal, SignalMap, CollectionOptions } from "./types";

/**
 * Creates a granular map signal: one value signal per key plus a structural version
 * signal. Writing an existing key is a value operation that wakes only readers of
 * that key; adding or removing keys is a structural change (version bump, zero child
 * writes) that wakes membership, iteration, and whole-callable readers. Calling the
 * container with no arguments returns a fresh plain `Map` that tracks everything;
 * calling it with a `Map` reconciles key-wise through the `merge`/`wrap`/`equals`
 * pipeline. Values are raw by default; the element-lifecycle hooks let a host package
 * layer deep semantics on top. `entry(k)` returns a stable handle whose readers wake
 * only on that key's value or membership changes.
 * @template K Key type.
 * @template V Value type.
 * @param initial Initial entries, each value passed through `wrap`.
 * @param options Per-value `equals`, plus element-lifecycle `wrap`/`merge` hooks.
 * @returns A granular map signal.
 * @throws {Error} When `options.equals`, `options.wrap`, or `options.merge` is present and not a function.
 */
export function signalMap<K, V>(
  initial?: Iterable<readonly [K, V]>,
  options?: CollectionOptions<V>
): SignalMap<K, V> {
  const hooks = createHooks("signalMap", options);
  const { read: version, bump } = createVersion();
  const handles = new Map<K, Signal<V>>(); // Every key ever live; kept after delete so entry() handles stay usable
  const entries = new Map<K, Signal<V | undefined>>(); // Memoized entry() handles, one per key ever requested
  const live = new Set<K>(); // Membership truth
  const handleEquals = hooks.ce ? { equals: hooks.ce } : undefined;
  const createHandle = (value: V): Signal<V> =>
    handleEquals ? signal(value, handleEquals) : signal(value);

  if (initial !== undefined) {
    const initialEntries = Array.from(initial);
    let i = 0;
    const len = initialEntries.length;
    while (i < len) {
      const [key, value] = initialEntries[i]!;
      handles.set(key, createHandle(hooks.wrap(value)));
      live.add(key);
      i++;
    }
  }

  const reconcile = (next: Map<K, V>): void => {
    let isStructural = false;
    const nextKeys = Array.from(next.keys());
    let i = 0;
    const len = nextKeys.length;
    while (i < len) {
      const key = nextKeys[i]!;
      if (live.has(key)) {
        writeValue(handles.get(key)!, next.get(key)!, hooks);
      } else {
        const existing = handles.get(key);
        if (existing) {
          existing(hooks.wrap(next.get(key)!));
        } else {
          handles.set(key, createHandle(hooks.wrap(next.get(key)!)));
        }
        live.add(key);
        isStructural = true;
      }
      i++;
    }
    const currentKeys = Array.from(live);
    i = 0;
    const currentLen = currentKeys.length;
    while (i < currentLen) {
      const key = currentKeys[i]!;
      if (!next.has(key)) {
        live.delete(key);
        isStructural = true;
      }
      i++;
    }
    isStructural && bump();
  };

  const container = function (next?: Map<K, V>) {
    if (arguments.length > 0) {
      reconcile(next as Map<K, V>);
      return;
    }
    version();
    const out = new Map<K, V>();
    const keysList = Array.from(live);
    let i = 0;
    const len = keysList.length;
    while (i < len) {
      const key = keysList[i]!;
      out.set(key, handles.get(key)!());
      i++;
    }
    return out;
  } as SignalMap<K, V>;

  container.get = (k: K): V | undefined => {
    version();
    if (!live.has(k)) return undefined;
    return handles.get(k)!();
  };

  container.set = (k: K, value: V): void => {
    if (live.has(k)) {
      writeValue(handles.get(k)!, value, hooks);
      return;
    }
    const existing = handles.get(k);
    if (existing) {
      existing(hooks.wrap(value));
    } else {
      handles.set(k, createHandle(hooks.wrap(value)));
    }
    live.add(k);
    bump();
  };

  container.has = (k: K): boolean => {
    version();
    return live.has(k);
  };

  container.delete = (k: K): boolean => {
    if (!live.has(k)) return false;
    live.delete(k);
    bump();
    return true;
  };

  container.size = (): number => {
    version();
    return live.size;
  };

  container.forEach = (fn: (value: V, key: K) => void): void => {
    version();
    const keysList = Array.from(live);
    let i = 0;
    const len = keysList.length;
    while (i < len) {
      const key = keysList[i]!;
      fn(handles.get(key)!(), key);
      i++;
    }
  };

  container.keys = (): K[] => {
    version();
    return Array.from(live);
  };

  container.values = (): V[] => {
    version();
    const out: V[] = [];
    const keysList = Array.from(live);
    let i = 0;
    const len = keysList.length;
    while (i < len) {
      out.push(handles.get(keysList[i]!)!());
      i++;
    }
    return out;
  };

  container.entry = (k: K): Signal<V | undefined> => {
    let handle = entries.get(k);
    if (handle === undefined) {
      // A computed over [version, value signal]: wakes on this key's value or
      // membership changes; unrelated structural wakes re-evaluate to the same
      // value and stop at the computed's equality gate.
      handle = computed((): V | undefined => {
        version();
        if (!live.has(k)) return undefined;
        return handles.get(k)!();
      });
      entries.set(k, handle);
    }
    return handle;
  };

  return container;
}

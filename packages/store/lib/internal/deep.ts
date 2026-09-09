import { signalArray, signalMap, signalSet, isFunction, isPlainObject, untracked } from "./core";
import type { CollectionOptions } from "./core";
import { createStore } from "./create";
import { isStore } from "./utils";

/**
 * @internal
 * Non-enumerable marker attached to every store-installed collection container
 * (after optional middleware/readonly wrapping), identifying it to snapshot and
 * cleanup walks that must discriminate containers from raw function elements
 * and preserved user functions.
 */
const collectionMarker = Symbol("hellajs.store.collection");

/**
 * @internal
 * Whether a function is a store-installed collection container (marked after
 * any middleware/readonly wrapping) — the discriminator between containers and
 * raw function elements or preserved user functions.
 * @param fn Candidate function.
 * @returns True when the function carries the collection marker.
 */
const isMarked = (fn: unknown): boolean =>
  isFunction(fn) && (fn as unknown as Record<symbol, unknown>)[collectionMarker] === true;

/**
 * @internal
 * Reader-method names the readonly collection guard forwards to the real
 * container. Every other method gets a throwing stub, so a future core mutator
 * fails closed on readonly keys instead of silently mutating.
 */
const collectionReaders = new Set(["get", "has", "length", "size", "keys", "values", "forEach", "map", "entry", "nodeAt"]);

/**
 * @internal
 * Options threaded from one store key into its installed collection container.
 */
interface CollectionKeyOptions {
  /** Store key owning the container; names the readonly guard's error. */
  key: string;
  /** Threads readonly into element stores and wraps the container in a throwing guard. */
  readonly: boolean;
  /** Per-element comparator for the container's child signals. */
  equals?: (previous: unknown, next: unknown) => boolean;
  /** Container-level transform over whole-collection setter calls; container methods bypass it. */
  middleware?: (value: unknown) => unknown;
}

/**

/**
 * @internal
 * Converts one collection element entering a container: plain objects become
 * element stores (readonly threads through), nested collections install nested
 * containers (full recursion), everything else passes raw.
 * @param element Raw incoming element.
 * @param key Store key owning the container; names nested readonly errors.
 * @param readonly Threads into element stores and nested containers.
 * @returns The converted element.
 */
const convertElement = (element: unknown, key: string, readonly: boolean): unknown => {
  if (isPlainObject(element)) {
    return createStore(element as Record<string, unknown>, readonly ? { readonly: true } : undefined);
  }
  if (Array.isArray(element) || element instanceof Map || element instanceof Set) {
    return installCollection(element, { key, readonly });
  }
  return element;
};

/**
 * @internal
 * Builds the collection container for one store key: dispatches on the value's
 * container kind, threads element conversion (`wrap`), the store-element patch
 * router (`merge`), and per-element equality into core's hooks, then layers
 * container-level middleware and (for readonly keys) a throwing guard on top.
 * @param value The Array/Map/Set initial value.
 * @param options Threaded per-key options.
 * @returns The installed container callable (marked with `collectionMarker`).
 */
export function installCollection(
  value: Array<unknown> | Map<unknown, unknown> | Set<unknown>,
  options: CollectionKeyOptions
): (...args: unknown[]) => unknown {
  const { key, readonly } = options;
  const wrap = (element: unknown): unknown => convertElement(element, key, readonly);
  const merge = (prev: unknown, next: unknown): boolean => {
    // Patch router: a plain object writing over an element store patches in
    // place (per-field wakes, untouched fields sleep) instead of replacing
    if (isStore(prev) && isPlainObject(next)) {
      (prev as { $update: (partial: Record<string, unknown>) => unknown }).$update(
        next as Record<string, unknown>
      );
      return true;
    }
    return false;
  };
  const hooks = { wrap, merge, ...(options.equals ? { equals: options.equals } : {}) } as CollectionOptions<unknown>;

  let container: (...args: unknown[]) => unknown;
  if (Array.isArray(value)) {
    container = signalArray(value as unknown[], hooks) as (...args: unknown[]) => unknown;
  } else if (value instanceof Map) {
    container = signalMap(value as Map<unknown, unknown>, hooks) as (...args: unknown[]) => unknown;
  } else {
    // Sets have no keyed positions or value writes: wrap is the only meaningful hook
    container = signalSet(value as Set<unknown>, { wrap }) as (...args: unknown[]) => unknown;
  }

  if (options.middleware) {
    // Capture the pre-wrap container: closing over the `container` binding would
    // recurse into this wrapper itself after the reassignment below
    const raw = container;
    const middleware = options.middleware;
    const wrapped = (...args: unknown[]): unknown =>
      args.length === 0 ? raw() : raw(middleware(args[0]));
    // Copy the method surface (non-function own properties like `name`/`prototype` are skipped)
    const names = Object.getOwnPropertyNames(raw);
    let mi = 0;
    const mLen = names.length;
    while (mi < mLen) {
      const name = names[mi]!;
      const member = (raw as unknown as Record<string, unknown>)[name];
      if (isFunction(member)) {
        Object.defineProperty(wrapped, name, { value: member, writable: true, configurable: true });
      }
      mi++;
    }
    container = wrapped;
  }

  if (readonly) {
    const guarded = container;
    const guard = (...args: unknown[]): unknown => {
      if (args.length > 0) {
        throw new Error(`[store] readonly key "${key}"`);
      }
      return guarded();
    };
    // Fail-closed surface: known readers forward, every other method throws
    const names = Object.getOwnPropertyNames(guarded);
    let i = 0;
    const len = names.length;
    while (i < len) {
      const name = names[i]!;
      const member = (guarded as unknown as Record<string, unknown>)[name];
      if (isFunction(member)) {
        Object.defineProperty(guard, name, {
          value: collectionReaders.has(name)
            ? member
            : (): never => {
              throw new Error(`[store] readonly key "${key}"`);
            },
          writable: true,
          configurable: true
        });
      }
      i++;
    }
    container = guard;
  }

  Object.defineProperty(container, collectionMarker, { value: true });

  return container;
}

/**
 * @internal
 * Deep-plain pass over a collection snapshot: element stores flatten to their
 * `$snapshot()`, nested collection containers resolve recursively, raw values
 * (plain objects included) pass through untouched.
 * @param value A container read result or one of its members.
 * @returns The deep-plain value.
 */
export function plainify(value: unknown): unknown {
  if (isStore(value)) {
    return (value as { $snapshot: () => unknown }).$snapshot();
  }
  if (isMarked(value)) {
    return plainify((value as () => unknown)());
  }
  if (Array.isArray(value)) {
    const out: unknown[] = [];
    let i = 0;
    const len = value.length;
    while (i < len) {
      out.push(plainify(value[i]));
      i++;
    }
    return out;
  }
  if (value instanceof Map) {
    const out = new Map<unknown, unknown>();
    const entries = Array.from(value.entries());
    let i = 0;
    const len = entries.length;
    while (i < len) {
      const [mapKey, mapValue] = entries[i]!;
      out.set(mapKey, plainify(mapValue));
      i++;
    }
    return out;
  }
  if (value instanceof Set) {
    const out = new Set<unknown>();
    const members = Array.from(value);
    let i = 0;
    const len = members.length;
    while (i < len) {
      out.add(plainify(members[i]));
      i++;
    }
    return out;
  }
  return value;
}

/**
 * @internal
 * Tears down the element stores behind one collection container: reads the
 * container's current members untracked, invokes `$cleanup` on each element
 * store, and recurses into nested containers. Raw members (including unmarked
 * functions) are never invoked.
 * @param container A store-installed collection container.
 */
export function cleanupMembers(container: () => unknown): void {
  const members = untracked(() => container());
  const cleanupMember = (member: unknown): void => {
    if (isStore(member)) {
      (member as { $cleanup: () => void }).$cleanup();
      return;
    }
    if (isMarked(member)) {
      cleanupMembers(member as () => unknown);
    }
  };
  if (Array.isArray(members)) {
    let i = 0;
    const len = members.length;
    while (i < len) {
      cleanupMember(members[i]!);
      i++;
    }
    return;
  }
  if (members instanceof Map) {
    const values = Array.from(members.values());
    let i = 0;
    const len = values.length;
    while (i < len) {
      cleanupMember(values[i]!);
      i++;
    }
    return;
  }
  if (members instanceof Set) {
    const list = Array.from(members);
    let i = 0;
    const len = list.length;
    while (i < len) {
      cleanupMember(list[i]!);
      i++;
    }
  }
}

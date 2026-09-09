import { signal } from "./signal";
import { createHooks, createVersion, peekSignal, writeValue } from "./internal/collections";
import type { Signal, SignalArray, CollectionOptions } from "./types";

/**
 * Per-element node: one child signal per element; the node array is the index map.
 * @template T
 */
interface ArrayNode<T> {
  /** The element's child signal. */
  s: Signal<T>;
}

/**
 * Creates a granular array signal: one child signal per element plus a structural
 * version signal. Value writes (`set`) wake only readers of that element; structural
 * operations (`push`, `pop`, `splice`, `insert`, length-changing setter calls) reorder
 * nodes and bump the version with zero child writes, waking every positional reader.
 * Calling the container with no arguments returns a fresh plain array that tracks
 * everything; calling it with an array reconciles position-wise through the
 * `merge`/`wrap`/`equals` pipeline. Elements are raw values by default; the
 * element-lifecycle hooks let a host package layer deep semantics on top.
 * @template T
 * @param initial Initial elements, each passed through `wrap`.
 * @param options Per-element `equals`, plus element-lifecycle `wrap`/`merge` hooks.
 * @returns A granular array signal.
 * @throws {Error} When `options.equals`, `options.wrap`, or `options.merge` is present and not a function.
 */
export function signalArray<T>(initial?: T[], options?: CollectionOptions<T>): SignalArray<T> {
  const hooks = createHooks("signalArray", options);
  const { read: version, bump } = createVersion();
  const nodes: ArrayNode<T>[] = [];
  const equals = hooks.ce ? { equals: hooks.ce } : undefined;
  const create = (value: T): ArrayNode<T> => ({ s: equals ? signal(value, equals) : signal(value) });

  if (initial !== undefined) {
    let i = 0;
    const len = initial.length;
    while (i < len) {
      nodes.push(create(hooks.wrap(initial[i]!)));
      i++;
    }
  }

  const container = function (next?: T[]) {
    if (arguments.length > 0) {
      // Reconcile position-wise through the value pipeline: equal positions write
      // nothing, changed positions write their child, length changes restructure
      const nextLen = (next as T[]).length;
      let i = 0;
      while (i < nextLen && i < nodes.length) {
        writeValue(nodes[i]!.s, (next as T[])[i]!, hooks);
        i++;
      }
      if (nextLen > nodes.length) {
        while (i < nextLen) {
          nodes.push(create(hooks.wrap((next as T[])[i]!)));
          i++;
        }
        bump();
      } else if (nextLen < nodes.length) {
        nodes.length = nextLen;
        bump();
      }
      return;
    }
    version();
    const out: T[] = [];
    let i = 0;
    const len = nodes.length;
    while (i < len) {
      out.push(nodes[i]!.s());
      i++;
    }
    return out;
  } as SignalArray<T>;

  container.get = (i: number): T | undefined => {
    version();
    const node = nodes[i];
    return node ? node.s() : undefined;
  };

  container.set = (i: number, value: T): void => {
    if (i < 0) return; // Native indexed-assignment parity: a negative index never addresses an element
    const node = nodes[i];
    if (node) {
      writeValue(node.s, value, hooks);
      return;
    }
    // Past the end: extend like native indexed assignment, filling gaps with undefined nodes
    while (nodes.length < i) {
      nodes.push(create(undefined as T));
    }
    nodes.push(create(hooks.wrap(value)));
    bump();
  };

  container.push = (...values: T[]): number => {
    let i = 0;
    const len = values.length;
    while (i < len) {
      nodes.push(create(hooks.wrap(values[i]!)));
      i++;
    }
    len > 0 && bump();
    return nodes.length;
  };

  container.pop = (): T | undefined => {
    const node = nodes.pop();
    if (!node) return undefined;
    bump();
    return peekSignal(node.s);
  };

  container.splice = (start: number, deleteCount?: number, ...insert: T[]): T[] => {
    const len = nodes.length;
    let from = Math.trunc(start);
    if (from < 0) {
      from = Math.max(len + from, 0);
    } else if (from > len) {
      from = len;
    }
    const count =
      deleteCount === undefined
        ? len - from
        : Math.min(Math.max(Math.trunc(deleteCount), 0), len - from);
    const insertNodes: ArrayNode<T>[] = [];
    let i = 0;
    const insertLen = insert.length;
    while (i < insertLen) {
      insertNodes.push(create(hooks.wrap(insert[i]!)));
      i++;
    }
    const removed = nodes.splice(from, count, ...insertNodes);
    (removed.length > 0 || insertLen > 0) && bump();
    const out: T[] = [];
    i = 0;
    const removedLen = removed.length;
    while (i < removedLen) {
      out.push(peekSignal(removed[i]!.s));
      i++;
    }
    return out;
  };

  container.insert = (i: number, ...values: T[]): void => {
    if (values.length === 0) return;
    const insertNodes: ArrayNode<T>[] = [];
    let vi = 0;
    const len = values.length;
    while (vi < len) {
      insertNodes.push(create(hooks.wrap(values[vi]!)));
      vi++;
    }
    nodes.splice(i, 0, ...insertNodes); // Native splice clamps `i`
    bump();
  };

  // A function's `length` property is non-writable (only configurable), so the
  // method rides in via defineProperty instead of plain assignment
  Object.defineProperty(container, "length", {
    value: (): number => {
      version();
      return nodes.length;
    },
    writable: true,
    configurable: true,
  });

  container.map = <U>(fn: (value: T, index: number) => U): U[] => {
    version();
    const out: U[] = [];
    let i = 0;
    const len = nodes.length;
    while (i < len) {
      out.push(fn(nodes[i]!.s(), i));
      i++;
    }
    return out;
  };

  container.forEach = (fn: (value: T, index: number) => void): void => {
    version();
    let i = 0;
    const len = nodes.length;
    while (i < len) {
      fn(nodes[i]!.s(), i);
      i++;
    }
  };

  container.nodeAt = (i: number): Signal<T> | undefined => {
    const node = nodes[i];
    return node ? node.s : undefined;
  };

  return container;
}

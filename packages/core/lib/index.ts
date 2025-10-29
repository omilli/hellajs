import type { ComputedState, Context, EffectState, Reactive, Signal, SignalState, Subscriber } from "./types";

export * from "./types";

// Current reactive context for dependency tracking
let context: Context = null;
// Batch nesting level counter
let batching = 0;
// Queue for batched subscribers
let batchQueue: Subscriber[] | null = null;
// Global version counter for change detection
let epoch = 0;
// Unique ID counter for effects and computed values
let effectId = 0;

/**
 * Creates a reactive signal with read and write capabilities.
 * @template T
 * @param {T} value
 * @returns {Signal<T>}
 */
export function signal<T>(value: T): Signal<T> {
  const subs: Subscriber[] = [];
  let version = 0;

  // Read signal value and track dependency
  function read(): T {
    if (context) {
      const { sources, flags } = context;
      const idx = sources.indexOf(node);
      if (idx === -1) {
        sources.push(node);
        flags.push(0);
      }
    }
    return value;
  }

  // Write new value and notify subscribers
  function write(newValue?: T): T {
    if (arguments.length === 0) return read();
    if (value === newValue) return value;
    value = newValue as T;
    version = ++epoch;

    if (batching) {
      let i = 0;
      while (i < subs.length) {
        const sub = subs[i++]!;
        if (batchQueue!.indexOf(sub) === -1) batchQueue!.push(sub);
      }
    } else {
      let i = 0;
      while (i < subs.length) subs[i++]!();
    }

    return value;
  }

  const node: SignalState<T> = { subs, read, version: () => version };

  write.subs = subs;
  write.version = () => version;
  write.read = read;

  return write as Signal<T>;
}

/**
 * Creates a reactive effect that runs when dependencies change.
 * @param {EffectFn} fn
 * @returns {() => void}
 */
export function effect(fn: () => void): () => void {
  const node: EffectState = {
    sources: [],
    flags: [],
    fn,
    cleanup: null,
    id: effectId++
  };

  // Execute effect and track dependencies
  function run(): void {
    if (!node.fn) return;

    cleanup();

    const prevContext = context;
    context = node;

    try {
      node.fn();
    } finally {
      context = prevContext;

      let i = 0;
      while (i < node.sources.length) {
        const source = node.sources[i]!;
        const subs = source.subs;
        if (subs.indexOf(run) === -1) subs.push(run);
        i++;
      }
    }
  }

  run.node = node;

  // Remove effect from all source subscriptions
  function cleanup(): void {
    let i = 0;
    while (i < node.sources.length) {
      const source = node.sources[i++]!;
      const subs = source.subs;
      const idx = subs.indexOf(run);
      if (idx !== -1) {
        const last = subs.length - 1;
        if (idx !== last) subs[idx] = subs[last]!;
        subs.length = last;
      }
    }
    node.sources.length = 0;
    node.flags.length = 0;
  }

  // Dispose effect and prevent further execution
  function dispose(): void {
    cleanup();
    node.fn = null;
  }

  run();

  return dispose;
}

/**
 * Creates a computed value that updates when dependencies change.
 * @template T
 * @param {ComputedFn<T>} fn
 * @returns {() => T}
 */
export function computed<T>(fn: () => T): () => T {
  let value: T;
  let version = -1;
  let maxVersion = -1;
  let dirty = true;
  const subs: Subscriber[] = [];
  const sources: Reactive[] = [];
  const flags: number[] = [];

  const node: ComputedState<T> = {
    subs,
    version: () => version,
    read: null as unknown as () => T,
    sources,
    flags,
    id: effectId++
  };

  // Mark computed as dirty and notify subscribers
  function notify(): void {
    if (!dirty) {
      dirty = true;
      // During batching, only mark as dirty, don't propagate
      // Effects will be notified by signals they depend on
      if (!batching) {
        let i = 0;
        while (i < subs.length) {
          const sub = subs[i++]!;
          sub();
        }
      }
    }
  }

  (notify as Subscriber).node = node;

  // Remove computed from all source subscriptions
  function cleanup(): void {
    let i = 0;
    while (i < sources.length) {
      const source = sources[i++]!;
      const sourceSubs = source.subs;
      const idx = sourceSubs.indexOf(notify as Subscriber);
      if (idx !== -1) {
        const last = sourceSubs.length - 1;
        if (idx !== last) sourceSubs[idx] = sourceSubs[last]!;
        sourceSubs.length = last;
      }
    }
  }

  // Recompute value if dirty and dependencies changed
  function update(): void {
    if (!dirty) return;

    //For non-initial updates, check if dependencies actually changed
    if (version !== -1 && sources.length > 0) {
      // Temporarily save context to avoid resubscription during dependency checks
      const prevContext = context;
      context = null;

      let anyChanged = false;
      let i = 0;
      while (i < sources.length) {
        const source = sources[i++]!;
        // If source is a computed, ensure it's up-to-date
        if (source.read) source.read();

        // Check version
        const sourceVersion = typeof source.version === 'function' ? source.version() : source.version;
        if (sourceVersion > maxVersion) {
          anyChanged = true;
        }
      }

      context = prevContext;

      if (!anyChanged) {
        dirty = false;
        return;
      }
    }

    dirty = false;
    cleanup();

    const prevContext = context;
    context = node;
    sources.length = 0;
    flags.length = 0;

    try {
      const newValue = fn();
      const changed = value !== newValue || version === -1;
      value = newValue;
      if (changed) version = ++epoch;
    } finally {
      context = prevContext;

      // Track max version of dependencies
      maxVersion = -1;
      let i = 0;
      while (i < sources.length) {
        const source = sources[i]!;
        const sourceVersion = typeof source.version === 'function' ? source.version() : source.version;
        if (sourceVersion > maxVersion) maxVersion = sourceVersion;

        const sourceSubs = source.subs;
        if (sourceSubs.indexOf(notify as Subscriber) === -1) sourceSubs.push(notify as Subscriber);
        i++;
      }
    }
  }

  // Read computed value and track dependency
  function read(): T {
    update();

    if (context) {
      const { sources: ctxSources, flags: ctxFlags } = context;
      const idx = ctxSources.indexOf(node);
      if (idx === -1) {
        ctxSources.push(node);
        ctxFlags.push(0);
      }
    }

    return value;
  }

  node.read = read;

  return read;
}

/**
 * Flushes all pending batched updates.
 * @returns {void}
 */
export function flush(): void {
  if (!batchQueue || batching === 0) return;

  const queue = batchQueue;
  batchQueue = [];

  // Sort by effect creation order (id)
  queue.sort((a, b) => (a.node?.id || 0) - (b.node?.id || 0));

  // Keep batching active while processing to prevent computed propagation
  const prevBatching = batching;
  batching = 1;
  let i = 0;
  while (i < queue.length) queue[i++]!();
  batching = prevBatching;
}

/**
 * Batches multiple updates into a single notification.
 * @param {() => void} fn
 * @returns {void}
 */
export function batch(fn: () => void): void {
  batching++;
  if (!batchQueue) batchQueue = [];

  try {
    fn();
  } finally {
    batching--;
    if (batching === 0 && batchQueue) {
      const queue = batchQueue;
      batchQueue = null;

      // Sort by effect creation order (id)
      queue.sort((a, b) => (a.node?.id || 0) - (b.node?.id || 0));

      // Keep batching active while processing to prevent computed propagation
      batching = 1;
      let i = 0;
      while (i < queue.length) queue[i++]!();
      batching = 0;
    }
  }
}

/**
 * Runs a function without tracking dependencies.
 * @template T
 * @param {() => T} fn
 * @returns {T}
 */
export function untracked<T>(fn: () => T): T {
  const prevContext = context;
  context = null;
  try {
    return fn();
  } finally {
    context = prevContext;
  }
}

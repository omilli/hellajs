import { signal, effect, computed, batch, untracked, type Signal } from './core';

/**
 * Creates a hash from a string.
 * @param str The string to hash.
 * @returns A hash string.
 */
export function hash(str: string): string {
  let hash = 5381, i = str.length;
  while (i) hash = (hash * 33) ^ str.charCodeAt(--i);
  return (hash >>> 0).toString(36);
}

/**
 * Stringifies an object for hashing.
 * @param obj The object to stringify.
 * @returns A string representation of the object.
 */
export function stringify(obj: any): string {
  if (typeof obj !== 'object' || obj === null) return String(obj);

  const keys = Object.keys(obj).sort();
  const pairs = keys.map(key => `${key}:${stringify(obj[key])}`);
  return `{${pairs.join(',')}}`;
}

/**
 * Global state for style sheets.
 */
export const globalState = {
  styleSheet: null as HTMLStyleElement | null,
  varsSheet: null as HTMLStyleElement | null,
  styleCounter: 0
};

/**
 * Reactive signal for CSS rules.
 */
export const cssRules = signal(new Map<string, string>());

/**
 * Reactive signal for CSS variable rules.
 */
export const varsRules = signal(new Map<string, string>());

/**
 * Cache for storing previously generated class names.
 */
export const cache = new Map<string, string>();

/**
 * Reference counts for tracking usage of CSS rules.
 */
export const refCounts = new Map<string, number>();

/**
 * Creates a style manager for handling CSS rules.
 * @param config The configuration for the style manager.
 * @returns An object with methods to manage styles.
 */
export function createStyleManager(config: {
  signal: Signal<Map<string, string>>;
  contentGenerator: (rules: Map<string, string>) => string;
  domUpdater: (content: string) => void;
  cachePrefix: string;
}) {
  const cache = new Map<string, string>();

  const content = computed(() => {
    const rules = config.signal();
    if (!rules || rules.size === 0) return '';

    const key = `${config.cachePrefix}-${rules.size}-${hash(Array.from(rules.entries()).join('|'))}`;

    let result = cache.get(key);
    if (!result) {
      result = config.contentGenerator(rules);
      if (cache.size >= 100) cache.clear();
      cache.set(key, result);
    }
    return result;
  });

  // Inlined debounce function
  let pending = false;
  let id: number | null = null;
  const timeout = 16;

  const isTest = typeof (globalThis as any)?.Bun !== 'undefined' ||
    typeof (globalThis as any)?.describe !== 'undefined';

  function schedule() {
    if (pending) return;
    pending = true;

    if (id !== null) clearTimeout(id);

    if (isTest) {
      queueMicrotask(() => {
        if (pending) {
          untracked(() => config.domUpdater(content()));
          pending = false;
        }
      });
    } else {
      id = setTimeout(() => {
        if (pending) {
          untracked(() => config.domUpdater(content()));
          pending = false;
          id = null;
        }
      }, timeout) as any;
    }
  }

  function flush() {
    if (pending) {
      if (id !== null) {
        clearTimeout(id);
        id = null;
      }
      untracked(() => config.domUpdater(content()));
      pending = false;
    }
  }

  let initialized = false;
  let effectDispose: (() => void) | null = null;

  function init() {
    if (initialized) return;
    initialized = true;
    effectDispose = effect(() => {
      content();
      schedule();
    });
  }

  return { content, init, flush };
}

/**
 * Batches updates to CSS rules.
 * @param fn The function to batch.
 * @returns The result of the function.
 */
export function batchUpdates<T>(fn: () => T): T {
  return batch(fn);
}

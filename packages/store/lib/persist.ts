import { signal, effect, batch, isObject, isFunction, hasWindow } from "./internal/core";
import type { Store, Snapshot, PartialDeep, StoreAdaptor, PersistOptions, PersistHandle } from "./types";

/**
 * Persists a store through a storage adaptor: rehydrates persisted state at
 * creation and writes every change through once hydration settles.
 *
 * Hydration contract: a plain-value read applies before `persistStore` returns
 * (no flash of initial state); a promise read applies when it resolves, unless
 * a projected key changed first — then the in-memory state wins (dirty-skip).
 * Corrupt or shape-drifted persisted state clears storage, keeps the initial
 * state, and reports through `onError` — the store never bricks on a bad
 * stored value. On the server (no `window`) the handle is inert: no adaptor
 * calls, no effects, `hydrated()` is true immediately.
 *
 * @template T
 * @param store Store to persist; hydration applies through `update()`, so middleware, `equals`, and the settable-key registry all run on hydrated values
 * @param adaptor Storage backend; shipped: `localStorageAdaptor`, `sessionStorageAdaptor`
 * @param options Serializer, projection, debounce, and error-channel configuration
 * @returns Handle exposing the reactive `hydrated()` flag, the `ready` promise, and `dispose()`
 */
export function persistStore<T extends Record<string, unknown>>(
  store: Store<T, PropertyKey>,
  adaptor: StoreAdaptor,
  options?: PersistOptions<T>
): PersistHandle {
  if (!hasWindow()) {
    return {
      hydrated: () => true,
      ready: Promise.resolve(),
      dispose: () => {}
    };
  }

  const serialize = options?.serialize ?? ((state: PartialDeep<T>) => JSON.stringify(state));
  const deserialize = options?.deserialize ?? ((raw: string) => JSON.parse(raw) as PartialDeep<T>);
  const partialize = options?.partialize ?? ((state: Snapshot<T>) => state as PartialDeep<T>);
  const onError = options?.onError;
  const debounceMs = options?.debounce;

  const hydratedSignal = signal(false);
  let resolveReady!: () => void;
  const ready = new Promise<void>((resolve) => {
    resolveReady = resolve;
  });

  let started = false;
  let dirty = false;
  let hydrated = false;
  let initialSerialization = "";
  let lastWritten: string | undefined;
  let pendingWrite: string | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let disposed = false;

  const writeNow = (value: string) => {
    Promise.resolve(adaptor.write(value)).catch((error: unknown) => {
      onError?.(error);
    });
  };

  const flushPending = () => {
    if (pendingWrite === undefined) return;
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
    const value = pendingWrite;
    pendingWrite = undefined;
    writeNow(value);
  };

  const scheduleWrite = (value: string) => {
    if (debounceMs === undefined) {
      writeNow(value);
      return;
    }
    pendingWrite = value;
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timer = undefined;
      flushPending();
    }, debounceMs);
  };

  // One effect is dirty-detector AND write-through: the immediate run captures
  // the baseline serialization; pre-hydration runs mark dirty and never write;
  // post-hydration runs dedupe against the last written string. The `hydrated`
  // flag is a plain read (not a reactive one) so the hydration flip itself
  // never triggers a write.
  const disposeEffect = effect(() => {
    const s = serialize(partialize(store.snapshot()));
    if (!started) {
      started = true;
      initialSerialization = s;
      return;
    }
    if (!hydrated) {
      if (s !== initialSerialization) dirty = true;
      return;
    }
    if (s === lastWritten) return;
    lastWritten = s;
    scheduleWrite(s);
  });

  const onPageHide = () => {
    flushPending();
  };
  if (debounceMs !== undefined) window.addEventListener("pagehide", onPageHide);

  const finish = () => {
    hydrated = true;
    hydratedSignal(true);
    resolveReady();
  };

  const settle = (raw: string | null) => {
    if (raw === null) {
      // First run with empty storage: materialize the initial state.
      lastWritten = initialSerialization;
      writeNow(initialSerialization);
      finish();
      return;
    }
    if (dirty) {
      // A projected key changed before the read resolved — in-memory wins;
      // lastWritten stays unset so the next change persists the newer state.
      finish();
      return;
    }
    try {
      // batch flushes the effect once, while `hydrated` is still false — the
      // pre-hydration branch suppresses any hydrate write-back.
      batch(() => {
        store.update(deserialize(raw));
      });
      lastWritten = serialize(partialize(store.snapshot()));
    } catch (error) {
      // Corrupt or shape-drifted: self-heal storage, keep the initial state.
      Promise.resolve(adaptor.clear()).catch((e: unknown) => {
        onError?.(e);
      });
      onError?.(error);
    }
    finish();
  };

  const raw = adaptor.read();
  if (isObject(raw) && isFunction(raw.then)) {
    raw.then(
      (value) => {
        if (!disposed) settle(value ?? null);
      },
      (error: unknown) => {
        onError?.(error);
        finish();
      }
    );
  } else {
    settle(raw as string | null);
  }

  return {
    hydrated: () => hydratedSignal(),
    ready,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      disposeEffect();
      if (timer !== undefined) clearTimeout(timer);
      pendingWrite = undefined;
      if (debounceMs !== undefined) window.removeEventListener("pagehide", onPageHide);
    }
  };
}

/**
 * Shared storage-adaptor factory. Storage is touched only inside the returned
 * methods — never at factory time — so module import and factory calls stay
 * safe on the server.
 */
const storageAdaptor = (getStorage: () => Storage, key: string): StoreAdaptor => ({
  read: () => getStorage().getItem(key),
  write: (value: string) => {
    getStorage().setItem(key, value);
  },
  clear: () => {
    getStorage().removeItem(key);
  }
});

/**
 * Creates a `StoreAdaptor` backed by `window.localStorage`. Storage access is
 * deferred to call time — `persistStore` never calls it on the server.
 * @param key Storage key to read, write, and clear under
 */
export function localStorageAdaptor(key: string): StoreAdaptor {
  return storageAdaptor(() => window.localStorage, key);
}

/**
 * Creates a `StoreAdaptor` backed by `window.sessionStorage`. Storage access is
 * deferred to call time — `persistStore` never calls it on the server.
 * @param key Storage key to read, write, and clear under
 */
export function sessionStorageAdaptor(key: string): StoreAdaptor {
  return storageAdaptor(() => window.sessionStorage, key);
}

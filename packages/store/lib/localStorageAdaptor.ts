import { storageAdaptor } from "./internal/storage";
import type { StoreAdaptor } from "./types";

/**
 * Creates a `StoreAdaptor` backed by `window.localStorage`. Storage access is
 * deferred to call time — `persistStore` never calls it on the server.
 * @param key Storage key to read, write, and clear under
 */
export function localStorageAdaptor(key: string): StoreAdaptor {
  return storageAdaptor(() => window.localStorage, key);
}

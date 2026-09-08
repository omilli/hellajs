import { storageAdaptor } from "./internal/storage";
import type { StoreAdaptor } from "./types";

/**
 * Creates a `StoreAdaptor` backed by `window.sessionStorage`. Storage access is
 * deferred to call time — `persistStore` never calls it on the server.
 * @param key Storage key to read, write, and clear under
 */
export function sessionStorageAdaptor(key: string): StoreAdaptor {
  return storageAdaptor(() => window.sessionStorage, key);
}

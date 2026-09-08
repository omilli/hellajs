import type { StoreAdaptor } from "../types";

/**
 * @internal
 * Shared storage-adaptor factory. Storage is touched only inside the returned
 * methods — never at factory time — so module import and factory calls stay
 * safe on the server.
 */
export const storageAdaptor = (getStorage: () => Storage, key: string): StoreAdaptor => ({
  read: () => getStorage().getItem(key),
  write: (value: string) => {
    getStorage().setItem(key, value);
  },
  clear: () => {
    getStorage().removeItem(key);
  }
});

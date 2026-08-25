/**
 * Window-focus and network-reconnect refetch controllers.
 */
import { hasDocument } from "./core";
import { resourceCache } from "../cache";

/**
 * @internal
 * Creates a window-focus refetch controller. Registers a visibilitychange listener that refetches when the tab becomes visible. The caller gates setup on its own refetchOnWindowFocus flag.
 * @param run - Callback invoked on refetch (receives force flag)
 * @returns An object with setup and clear methods
 */
export function createFocus(run: (force: boolean) => void): { setup: () => void; clear: () => void } {
  let cleanup: (() => void) | undefined;

  /** Removes the visibilitychange listener and clears its cleanup function. */
  const clear = () => {
    cleanup?.();
    cleanup = undefined;
  };

  /** Registers a visibilitychange listener that refetches when the tab becomes visible. */
  const setup = () => {
    clear();

    if (!hasDocument()) return;

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        run(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    cleanup = () => document.removeEventListener("visibilitychange", handleVisibility);
  };

  return { setup, clear };
}

/**
 * @internal
 * Creates a reconnect refetch controller. Subscribes to network reconnect events via resourceCache.onOnlineChange to trigger refetch. The caller gates setup on its own refetchOnReconnect flag.
 * @param run - Callback invoked on refetch (receives force flag)
 * @returns An object with setup and clear methods
 */
export function createReconnect(run: (force: boolean) => void): { setup: () => void; clear: () => void } {
  let cleanup: (() => void) | undefined;

  /** Tears down the online/offline reconnect subscription and clears its cleanup function. */
  const clear = () => {
    cleanup?.();
    cleanup = undefined;
  };

  /** Subscribes to network reconnect events via resourceCache.onOnlineChange. */
  const setup = () => {
    clear();

    cleanup = resourceCache.onOnlineChange((online) => {
      if (online) run(false);
    });
  };

  return { setup, clear };
}

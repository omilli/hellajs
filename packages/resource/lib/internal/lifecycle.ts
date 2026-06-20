/**
 * Window-focus and network-reconnect refetch controllers.
 */
import { hasDocument } from "./core";
import { resourceCache } from "../cache";

/**
 * @internal
 * Creates a window-focus refetch controller. Registers a visibilitychange listener that refetches when the tab becomes visible, when enabled.
 * @param refetchOnWindowFocus - Whether focus refetch is enabled
 * @param run - Callback invoked on refetch (receives force flag)
 * @returns An object with setup and clear methods
 */
export const createFocus = (
  refetchOnWindowFocus: boolean,
  run: (force: boolean) => void
): { setup: () => void; clear: () => void } => {
  let cleanup: (() => void) | undefined;

  /** Removes the visibilitychange listener and clears its cleanup function. */
  const clear = () => {
    cleanup?.();
    cleanup = undefined;
  };

  /** Registers a visibilitychange listener that refetches when the tab becomes visible, when refetchOnWindowFocus is enabled. */
  const setup = () => {
    clear();

    if (!refetchOnWindowFocus) return;

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
};

/**
 * @internal
 * Creates a reconnect refetch controller. Subscribes to network reconnect events via resourceCache.onOnlineChange to trigger refetch, when enabled.
 * @param refetchOnReconnect - Whether reconnect refetch is enabled
 * @param run - Callback invoked on refetch (receives force flag)
 * @returns An object with setup and clear methods
 */
export const createReconnect = (
  refetchOnReconnect: boolean,
  run: (force: boolean) => void
): { setup: () => void; clear: () => void } => {
  let cleanup: (() => void) | undefined;

  /** Tears down the online/offline reconnect subscription and clears its cleanup function. */
  const clear = () => {
    cleanup?.();
    cleanup = undefined;
  };

  /** Subscribes to network reconnect events via resourceCache.onOnlineChange to trigger refetch, when refetchOnReconnect is enabled. */
  const setup = () => {
    clear();

    if (!refetchOnReconnect) return;

    cleanup = resourceCache.onOnlineChange((online) => {
      if (online) run(false);
    });
  };

  return { setup, clear };
};

/**
 * Window-focus and network-reconnect refetch controllers.
 */
import { hasDocument, hasWindow } from "./core";
import { resourceCache } from "../cache";

/**
 * @internal
 * Creates a window-focus refetch controller. Registers a visibilitychange listener that refetches when the tab becomes visible and a window focus listener that refetches when the window gains focus (covers app-switching without hiding the tab). The caller gates setup on its own refetchOnWindowFocus flag.
 * @param run - Callback invoked on refetch (receives force flag)
 * @returns An object with setup and clear methods
 */
export function createFocus(run: (force: boolean) => void): { setup: () => void; clear: () => void } {
  const cleanups: (() => void)[] = [];

  /** Removes the visibilitychange and focus listeners and clears the cleanup list. */
  const clear = () => {
    while (cleanups.length) {
      cleanups.pop()?.();
    }
  };

  /** Registers visibilitychange and window focus listeners that refetch when the tab becomes visible or the window gains focus. */
  const setup = () => {
    clear();

    if (hasDocument()) {
      const handleVisibility = () => {
        if (document.visibilityState === "visible") {
          run(false);
        }
      };

      document.addEventListener("visibilitychange", handleVisibility);
      cleanups.push(() => document.removeEventListener("visibilitychange", handleVisibility));
    }

    if (hasWindow()) {
      const handleFocus = () => run(false);

      window.addEventListener("focus", handleFocus);
      cleanups.push(() => window.removeEventListener("focus", handleFocus));
    }
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

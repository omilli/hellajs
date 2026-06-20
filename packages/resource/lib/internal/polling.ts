/**
 * Interval polling controller for periodic resource refetch.
 */
import { untracked, hasDocument } from "./core";

/** Configuration for creating a polling controller. */
interface PollingConfig<TTransformed> {
  /** Interval in ms, false to disable, or function returning interval based on current data. */
  refetchInterval: number | false | undefined | ((data: TTransformed | undefined) => number | false);
  /** Whether to continue polling when the tab is hidden. */
  refetchIntervalInBackground: boolean;
  /** Reactive accessor for current (transformed) data, used to compute dynamic intervals. */
  data: () => TTransformed | undefined;
  /** Callback invoked on each poll tick. */
  run: (force: boolean) => void;
}

/**
 * @internal
 * Creates a polling controller with setup/clear methods wrapping recursive setTimeout polling that respects tab visibility and dynamic intervals.
 * @template TTransformed - The transformed data type used by dynamic interval functions
 * @param config - Polling configuration
 * @returns An object with setup and clear methods
 */
export const createPolling = <TTransformed>(config: PollingConfig<TTransformed>): {
  setup: () => void;
  clear: () => void;
} => {
  const { refetchInterval, refetchIntervalInBackground, data, run } = config;

  let cleanup: (() => void) | undefined;

  /** Tears down the active polling timer and clears its cleanup function. */
  const clear = () => {
    cleanup?.();
    cleanup = undefined;
  };

  /** Sets up recursive setTimeout polling that respects tab visibility and dynamic intervals. */
  const setup = () => {
    clear();

    // Skip if no interval configured
    if (refetchInterval === undefined || refetchInterval === false || refetchInterval === 0) return;

    let stopped = false;

    const executePoll = () => {
      // Skip if tab hidden and background polling disabled
      if (!refetchIntervalInBackground && hasDocument() && document.visibilityState === "hidden") return;
      run(false);
    };

    const scheduleNext = (interval: number) => {
      if (stopped) return;

      const timeoutId = setTimeout(() => {
        executePoll();
        // Get next interval (dynamic or fixed)
        const nextInterval = typeof refetchInterval === "function"
          ? refetchInterval(untracked(data))
          : (refetchInterval as number);
        if (nextInterval && nextInterval > 0) {
          scheduleNext(nextInterval);
        }
      }, interval);

      // Store cleanup that also clears the pending timeout
      const prevCleanup = cleanup;
      cleanup = () => {
        stopped = true;
        clearTimeout(timeoutId);
        prevCleanup?.();
      };
    };

    // Get initial interval
    const initialInterval = typeof refetchInterval === "function"
      ? refetchInterval(undefined)
      : (refetchInterval as number);

    if (initialInterval && initialInterval > 0) {
      scheduleNext(initialInterval);
    }
  };

  return { setup, clear };
};

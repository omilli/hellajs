import { setCurrentSub } from "./internal/context";
import { isFunction } from "./internal/utils";

/**
 * Executes a function without tracking any signal dependencies.
 * @template T
 * @param untrackedFn The function to execute.
 * @returns The return value of the function.
 * @throws {Error} When untrackedFn is not a function.
 */
export function untracked<T>(untrackedFn: () => T): T {
  if (!isFunction(untrackedFn)) {
    throw new Error(`[core] untracked: untrackedFn must be a function, received ${typeof untrackedFn}`);
  }
  const prevSub = setCurrentSub(undefined); // Disable dependency tracking
  try {
    return untrackedFn(); // Execute without creating dependencies
  } finally {
    setCurrentSub(prevSub); // Restore previous tracking context
  }
}

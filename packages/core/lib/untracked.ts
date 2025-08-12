import { setCurrentSub } from "./reactive";

/**
 * Executes a function without tracking any signal dependencies.
 * @template T
 * @param fn The function to execute.
 * @returns The return value of the function.
 */
export function untracked<T>(fn: () => T): T {
  const prevSub = setCurrentSub(undefined);
  try {
    return fn();
  } finally {
    setCurrentSub(prevSub);
  }
}

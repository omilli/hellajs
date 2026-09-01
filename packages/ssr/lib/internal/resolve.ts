/**
 * @internal
 * Resolves a value by calling it if it is a function (signal/getter).
 */
export function resolveValue(value: unknown): unknown {
  return typeof value === "function" ? (value as () => unknown)() : value;
}

/**
 * @internal
 * True for thenables — a reactive getter may resolve to a Promise that the async walker awaits;
 * the sync walker warns on one (it cannot await) instead.
 */
export function isPromise(value: unknown): value is Promise<unknown> {
  return value !== null && typeof value === "object" && typeof (value as { then?: unknown }).then === "function";
}

/**
 * @internal
 * Resolves a value by calling it if it is a function, then awaiting it if it is a Promise. Async counterpart to `resolveValue`; one `await` fully unwraps nested thenables.
 */
export async function resolveAsync(value: unknown): Promise<unknown> {
  const resolved = resolveValue(value);
  return isPromise(resolved) ? await resolved : resolved;
}

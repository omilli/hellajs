/**
 * @internal
 * Resolves a value by calling it if it is a function (signal/getter).
 */
export function resolveValue(value: unknown): unknown {
  return typeof value === "function" ? (value as () => unknown)() : value;
}

/**
 * @internal
 * Structural shape of an isDynamic component function — mirrors dom's `RenderFn` without a runtime import.
 */
interface DynamicFn {
  isDynamic?: true;
}

/**
 * @internal
 * Resolves a value by repeatedly calling plain (non-`isDynamic`) functions until a non-function
 * or an `isDynamic` render function remains — reactive child chains (`() => () => nodes`, a
 * component slot forwarding `${() => props.children}`) classify by their final value, matching
 * dom's `resolveDeep`. A self-referential getter loops forever, the same user bug as a
 * self-referencing computed.
 */
export function resolveDeep(value: unknown): unknown {
  let current = value;
  while (typeof current === "function" && !(current as DynamicFn).isDynamic) {
    current = (current as () => unknown)();
  }
  return current;
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
 * The warn emitted when a thenable reaches the sync walk — it cannot await, so the value stringifies to `[object Promise]` into the HTML exactly as before; `ssr.async`/`ssr.stream` await it instead.
 */
export const SYNC_PROMISE_WARN = "[ssr] Promise value under sync ssr - use ssr.async or ssr.stream, got [object Promise] emitted";

/**
 * @internal
 * Resolves a value by calling it if it is a function, then awaiting it if it is a Promise. Async counterpart to `resolveValue`; one `await` fully unwraps nested thenables.
 */
export async function resolveAsync(value: unknown): Promise<unknown> {
  const resolved = resolveValue(value);
  return isPromise(resolved) ? await resolved : resolved;
}

/**
 * @internal
 * Async counterpart to `resolveDeep`: calls each plain (non-`isDynamic`) function hop, awaiting
 * any Promise it returns before continuing the chain. Stops at the first non-function or
 * `isDynamic` render function.
 */
export async function resolveAsyncDeep(value: unknown): Promise<unknown> {
  let current = value;
  while (typeof current === "function" && !(current as DynamicFn).isDynamic) {
    current = await resolveAsync(current);
  }
  return current;
}

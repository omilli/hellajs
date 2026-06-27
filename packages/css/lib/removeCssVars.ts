import type { CSSVarInputObject, CSSVarsOptions } from "./types";
import { hash, stringify } from "./internal/shared";
import { varsRegistryReactive, varsResultReactive, varsRegistryStatic, cache, removeFromScope } from "./internal/varsStore";
import { isPlainObject } from "./internal/core";

/**
 * Removes CSS custom properties by decrementing the reference count.
 * The variables are removed from the stylesheet only when the reference count reaches zero.
 * @template T
 * @param vars Object containing CSS variable definitions (must match the object passed to cssVars)
 * @param options Configuration options (must match the options used in cssVars)
 */
export function removeCssVars<T extends CSSVarInputObject>(vars: T, options: CSSVarsOptions = {}): void {
  if (!isPlainObject(vars)) throw new Error(`[css] removeCssVars: expected a plain object, received ${String(vars)}`);

  const reactiveEntry = varsRegistryReactive.get(vars);
  if (reactiveEntry) {
    reactiveEntry.refCount--;
    if (reactiveEntry.refCount > 0) return;

    if (reactiveEntry.cleanup) reactiveEntry.cleanup();
    removeFromScope(reactiveEntry.scope, reactiveEntry.flatKeys, reactiveEntry.prefix);
    varsRegistryReactive.delete(vars);
    varsResultReactive.delete(vars);
    return;
  }

  const inputHash = hash(stringify(vars) + stringify(options));
  const staticEntry = varsRegistryStatic.get(inputHash);
  if (!staticEntry) return;

  staticEntry.refCount--;
  if (staticEntry.refCount > 0) return;

  cache.delete(inputHash);
  removeFromScope(staticEntry.scope, staticEntry.flatKeys, staticEntry.prefix);
  varsRegistryStatic.delete(inputHash);
}

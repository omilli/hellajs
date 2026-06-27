import { cleanupVarsEffects } from "./internal/reactive";
import { resetSheet } from "./internal/sheet";
import { VARS_ID, scopedVarsRulesMap, cache, varsRegistryStatic, resetReactiveRegistries } from "./internal/varsStore";

/**
 * Clears all CSS variables, caches, and reactive effects, resetting the CSS variables system to initial state.
 */
export function cssVarsReset() {
  cleanupVarsEffects();
  scopedVarsRulesMap.clear();
  resetSheet(VARS_ID);
  cache.clear();
  varsRegistryStatic.clear();
  resetReactiveRegistries();
}

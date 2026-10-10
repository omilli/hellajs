import { varsText } from "./internal/vars";

/**
 * @internal
 * Collects the vars-side registration text — the `cssText.vars()` namespace
 * member. Thin delegate over `varsText()`: the default-host bucket rules in
 * registration order, media-wrapped when the bucket's `media` option was
 * set.
 * @returns The vars-side text, `""` when nothing vars-side is registered
 */
export function cssTextVars(): string {
  return varsText();
}

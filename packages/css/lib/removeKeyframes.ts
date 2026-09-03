import { isPlainObject } from "./internal/core";
import { STYLE_ID, injectedMap } from "./internal/injection";
import { removeRule } from "./internal/sheet";
import { keyframesRule } from "./keyframes";
import type { KeyframesObject } from "./types";

/**
 * Removes a `@keyframes` rule created by `keyframes()` and decrements its
 * reference count for memory management.
 *
 * Re-derives the name and rule text from the same object — the deterministic
 * transform `keyframes()` uses — so structurally identical objects always
 * locate the injected entry. Registration state is decremented on both
 * platforms; the CSSOM rule drops at zero references (a no-op without a DOM).
 * @param obj Keyframes object to remove (structurally identical objects match, same reference not required)
 * @throws {Error} When obj is not a plain object.
 */
export function removeKeyframes(obj: KeyframesObject): void {
  if (!isPlainObject(obj)) throw new Error(`[css] removeKeyframes: expected a CSS object, received ${String(obj)}`);

  const { cssText: text } = keyframesRule(obj);
  const entry = injectedMap.get(text);
  if (!entry) return;

  entry.count--;
  if (entry.count > 0) return;

  let i = 0;
  while (i < entry.ruleCount) {
    removeRule(STYLE_ID, `${text}:${i}`);
    i++;
  }
  injectedMap.delete(text);
}

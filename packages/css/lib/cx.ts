import { isNumber, isString } from "./internal/core";
import type { CXArg } from "./types";

/**
 * Flattens one argument into class fragments: strings and numbers contribute
 * themselves, objects contribute the keys whose values are truthy, and arrays
 * recurse. Falsy items drop.
 * @param parts Accumulated class fragments
 * @param mix The argument value to flatten
 */
function appendValue(parts: string[], mix: string | number | Record<string, unknown> | CXArg[]): void {
  if (isString(mix) || isNumber(mix)) {
    parts.push(`${mix}`);
    return;
  }

  if (Array.isArray(mix)) {
    let i = 0;
    const len = mix.length;
    while (i < len) {
      const item = mix[i++];
      if (item) appendValue(parts, item);
    }
    return;
  }

  // Plain object: keep the keys whose values are truthy.
  const keys = Object.keys(mix);
  let i = 0;
  const len = keys.length;
  while (i < len) {
    const key = keys[i++] as string;
    if ((mix as Record<string, unknown>)[key]) parts.push(key);
  }
}

/**
 * Joins class-name fragments into one space-separated string: strings and
 * numbers contribute themselves, falsy values drop, objects contribute the
 * keys whose values are truthy, and arrays recurse. The result never carries
 * leading or trailing whitespace.
 * @param args Class fragments to join
 * @returns The joined class string — `""` when nothing survives
 */
export function cx(...args: CXArg[]): string {
  const parts: string[] = [];
  let i = 0;
  const len = args.length;
  while (i < len) {
    const arg = args[i++];
    if (arg) appendValue(parts, arg);
  }
  return parts.join(" ");
}

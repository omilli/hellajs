/** Returns true if a `window` global is present. */
export function hasWindow(): boolean {
  return typeof window !== "undefined";
}

/** Returns true if a `document` global is present. */
export function hasDocument(): boolean {
  return typeof document !== "undefined";
}

/** Returns true if a `navigator` global is present. */
export function hasNavigator(): boolean {
  return typeof navigator !== "undefined";
}

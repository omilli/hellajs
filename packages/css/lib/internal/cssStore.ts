import { hasDocument } from "./core";
import { stringify } from "./shared";
import type { CSSObject, CSSOptions } from "../types";

/**
 * @internal
 */
export const STYLE_ID = "hella-css";

/**
 * @internal
 */
export const refCounts = new Map<string, number>();

/**
 * @internal
 */
export const inlineCache = new Map<string, string>();

/**
 * @internal
 */
export const cssRulesMap = new Map<string, string>();

/**
 * @internal
 */
export const ruleCounts = new Map<string, number>();

/**
 * @internal
 * Creates a deterministic cache key from the CSS object and options.
 */
export function hashKey(obj: CSSObject, options: CSSOptions): string {
  return `${stringify(obj)}:${options.name || ""}`;
}

/**
 * @internal
 * Mirrors the current CSS rules text into the style element for DevTools visibility.
 */
export function syncTextContent(): void {
  if (!hasDocument()) return;
  const el = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (el) {
    el.textContent = Array.from(cssRulesMap.values()).join("");
  }
}
